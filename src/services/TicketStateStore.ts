import {
  AgentProcessingResult,
  ClarificationMode,
  FieldVerificationStatus,
  TicketDuplicate,
  UserSession,
  WsnTicketData
} from '../types';
import { MOCK_SCENARIOS, SCENARIO_LOW_CONFIDENCE } from '../mock/mockData';
import { authConfig, aiConfig, wsnConfig, uiConfig } from '../config';
import { forlandApiService } from './ForlandApiService';
import { dropdownDataService } from './DropdownDataService';
import { DuplicateFinder } from './DuplicateFinder';
import { formatDateTimeInput, formatForlandDateTimeMinutePrecision, formatForlandDateTimeMinutePrecisionWithTimezone } from '../utils/wsn';

export type StateChangeListener = () => void;

export class TicketStateStore {
  private static instance: TicketStateStore;

  private currentUser: UserSession | null = null;
  private result: AgentProcessingResult;
  private formData: WsnTicketData;
  private verifications: FieldVerificationStatus;
  private forceRegistrationUnlocked: boolean = false;
  private clarificationMode: ClarificationMode = 'TEXT_HINTS';
  private isCallIntercepted: boolean = false;
  private selectedDuplicate: TicketDuplicate | null = null;
  private isSubmitted: boolean = false;
  private isProcessingAudio: boolean = false;
  private activeScenarioId: string = aiConfig.SCENARIOS.LOW_CONFIDENCE;

  private duplicateFinder = new DuplicateFinder();

  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    this.result = { ...SCENARIO_LOW_CONFIDENCE };
    this.formData = this.extractTicketData(this.result.ticket);
    this.verifications = this.initVerifications(this.result);
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const saved = sessionStorage.getItem(authConfig.STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public static getInstance(): TicketStateStore {
    if (!TicketStateStore.instance) {
      TicketStateStore.instance = new TicketStateStore();
    }
    return TicketStateStore.instance;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private extractTicketData(ticketPartial: Partial<WsnTicketData>): WsnTicketData {
    return {
      appealType: ticketPartial.appealType || '',
      ticketType: ticketPartial.ticketType || '',
      applicantName: ticketPartial.applicantName || '',
      applicantAddress: ticketPartial.applicantAddress || '',
      addressText: ticketPartial.addressText || '',
      coordinates: ticketPartial.coordinates || '',
      phoneNumber: ticketPartial.phoneNumber || '',
      incidentDateTime: ticketPartial.incidentDateTime || formatDateTimeInput(new Date()),
      notes: ticketPartial.notes || ''
    };
  }

  private initVerifications(result: AgentProcessingResult): FieldVerificationStatus {
    const isGlobalReview = result.requiresManualReview;
    const lowClassification = result.confidence.classification < aiConfig.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowAddress = result.confidence.addressExtraction < aiConfig.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowGeo = result.confidence.geocoding < aiConfig.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowSpeech = result.confidence.speechRecognition < aiConfig.CONFIDENCE_THRESHOLD || isGlobalReview;

    return {
      appealType: !lowClassification,
      ticketType: !lowClassification,
      addressText: !lowAddress,
      coordinates: !lowGeo,
      notes: !lowSpeech
    };
  }

  public loadScenario(scenarioId: string): void {
    const found = MOCK_SCENARIOS.find(s => s.id === scenarioId);
    if (found) {
      this.activeScenarioId = scenarioId;
      this.result = JSON.parse(JSON.stringify(found.data));
      this.formData = this.extractTicketData(this.result.ticket);
      this.verifications = this.initVerifications(this.result);
      this.forceRegistrationUnlocked = false;
      this.isCallIntercepted = false;
      this.selectedDuplicate = null;
      this.isSubmitted = false;
      this.notify();
    }
  }

  public setIsProcessingAudio(processing: boolean): void {
    this.isProcessingAudio = processing;
    this.notify();
  }

  public async loadRealResult(realResult: AgentProcessingResult): Promise<void> {
    this.activeScenarioId = aiConfig.SCENARIOS.REAL_AUDIO;
    this.isProcessingAudio = false;
    this.result = realResult;

    // Automated duplicate check against WSN database using real API
    if ((!this.result.duplicatesFound || this.result.duplicatesFound.length === 0) && this.result.requiresTicketRegistration) {
      try {
        const found = await this.duplicateFinder.findRealDuplicates({
          addressText: this.result.ticket.addressText || '',
          searchText: this.result.ticket.addressText || '',
          appealType: this.result.ticket.appealType || wsnConfig.OPTIONS.APPEAL_TYPES[0]
        });
        if (found.length > 0) {
          this.result.duplicatesFound = found;
        }
      } catch (error) {
        console.error('Error in real duplicate check, falling back to local:', error);
        // Fallback to local detection if API fails
        const found = this.duplicateFinder.find({
          addressText: this.result.ticket.addressText || '',
          searchText: this.result.ticket.addressText || '',
          appealType: this.result.ticket.appealType || wsnConfig.OPTIONS.APPEAL_TYPES[0]
        });
        if (found.length > 0) {
          this.result.duplicatesFound = found;
        }
      }
    }

    this.formData = this.extractTicketData(this.result.ticket);
    this.verifications = this.initVerifications(this.result);
    this.forceRegistrationUnlocked = false;
    this.isCallIntercepted = false;
    this.selectedDuplicate = null;
    this.isSubmitted = false;
    this.notify();
  }

  // Getters
  public async login(username: string, password: string): Promise<boolean> {
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    // Try Forland API login first
    const forlandLoginSuccess = await forlandApiService.login(
      authConfig.DEFAULT_ADMIN_USER,
      authConfig.DEFAULT_ADMIN_PASS
    );

    // Fallback to local auth if Forland fails or for testing
    const localAuthSuccess =
      (user === authConfig.DEFAULT_ADMIN_USER && pass === authConfig.DEFAULT_ADMIN_PASS) ||
      (user === authConfig.DEFAULT_OPERATOR_USER && pass === authConfig.DEFAULT_ADMIN_PASS);

    if (forlandLoginSuccess || localAuthSuccess) {
      const isAdmin = user === authConfig.DEFAULT_ADMIN_USER;
      this.currentUser = {
        username: user,
        displayName: isAdmin ? authConfig.ADMIN_DISPLAY_NAME : authConfig.OPERATOR_DISPLAY_NAME,
        role: isAdmin ? authConfig.ADMIN_ROLE : authConfig.OPERATOR_ROLE,
        operatorId: wsnConfig.OPERATOR_ID
      };
      try {
        sessionStorage.setItem(authConfig.STORAGE_KEY, JSON.stringify(this.currentUser));
      } catch {
        // Ignore session storage errors
      }

      // Load dropdown data after successful login
      await dropdownDataService.loadDropdownData();

      this.notify();
      return true;
    }
    return false;
  }

  public async logout(): Promise<void> {
    // Try Forland API logout
    await forlandApiService.logout();

    this.currentUser = null;
    try {
      sessionStorage.removeItem(authConfig.STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.notify();
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getCurrentUser(): UserSession | null {
    return this.currentUser;
  }

  public getResult(): AgentProcessingResult {
    return this.result;
  }

  public getFormData(): Readonly<WsnTicketData> {
    return this.formData;
  }

  public getVerifications(): Readonly<FieldVerificationStatus> {
    return this.verifications;
  }

  public isForceUnlocked(): boolean {
    return this.forceRegistrationUnlocked;
  }

  public getClarificationMode(): ClarificationMode {
    return this.clarificationMode;
  }

  public getCallIntercepted(): boolean {
    return this.isCallIntercepted;
  }

  public getSelectedDuplicate(): TicketDuplicate | null {
    return this.selectedDuplicate;
  }

  public getIsSubmitted(): boolean {
    return this.isSubmitted;
  }

  public getIsProcessingAudio(): boolean {
    return this.isProcessingAudio;
  }

  public getActiveScenarioId(): string {
    return this.activeScenarioId;
  }

  // Setters & Actions
  public updateFormField<K extends keyof WsnTicketData>(field: K, value: WsnTicketData[K]): void {
    this.formData[field] = value;
    this.notify();
  }

  public toggleVerification(field: keyof FieldVerificationStatus): void {
    this.verifications[field] = !this.verifications[field];
    this.notify();
  }

  public setForceUnlocked(unlocked: boolean): void {
    this.forceRegistrationUnlocked = unlocked;
    this.notify();
  }

  public setClarificationMode(mode: ClarificationMode): void {
    this.clarificationMode = mode;
    this.notify();
  }

  public toggleCallIntercept(): void {
    this.isCallIntercepted = !this.isCallIntercepted;
    this.notify();
  }

  public setSelectedDuplicate(dup: TicketDuplicate | null): void {
    this.selectedDuplicate = dup;
    this.notify();
  }

  public appendSuggestedQuestion(questionText: string): void {
    if (this.formData.notes) {
      this.formData.notes += `\n${uiConfig.NOTES_CLARIFICATION_PREFIX}${questionText}`;
    } else {
      this.formData.notes = `${uiConfig.NOTES_CLARIFICATION_PREFIX}${questionText}`;
    }
    this.notify();
  }

  // Confidence low check helpers
  public isFieldLowConfidence(field: keyof FieldVerificationStatus): boolean {
    const conf = this.result.confidence;
    const isGlobal = this.result.requiresManualReview;

    switch (field) {
      case 'appealType':
      case 'ticketType':
        return conf.classification < aiConfig.CONFIDENCE_THRESHOLD || isGlobal;
      case 'addressText':
        return conf.addressExtraction < aiConfig.CONFIDENCE_THRESHOLD || isGlobal;
      case 'coordinates':
        return conf.geocoding < aiConfig.CONFIDENCE_THRESHOLD || isGlobal;
      case 'notes':
        return conf.speechRecognition < aiConfig.CONFIDENCE_THRESHOLD || isGlobal;
      default:
        return false;
    }
  }

  // Validation rules (Requirement 4)
  public isValid(): boolean {
    // 1. Mandatory fields notes (328) and coordinates (-420) must be filled out
    if (!this.formData.notes || !this.formData.notes.trim()) {
      return false;
    }
    if (!this.formData.coordinates || !this.formData.coordinates.trim()) {
      return false;
    }

    // 2. Unverified fields with low confidence must be verified (checkbox checked)
    const fieldsToVerify: (keyof FieldVerificationStatus)[] = ['appealType', 'ticketType', 'addressText', 'coordinates', 'notes'];
    for (const field of fieldsToVerify) {
      if (this.isFieldLowConfidence(field) && !this.verifications[field]) {
        return false;
      }
    }

    // 3. Requires ticket registration check (must be true or force unlocked)
    if (!this.result.requiresTicketRegistration && !this.forceRegistrationUnlocked) {
      return false;
    }

    return true;
  }

  public getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.formData.coordinates || !this.formData.coordinates.trim()) {
      errors.push(`Обов\'язкове поле "${wsnConfig.FIELD_LABELS.coordinates}" не заповнене`);
    }
    if (!this.formData.notes || !this.formData.notes.trim()) {
      errors.push(`Обов\'язкове поле "${wsnConfig.FIELD_LABELS.notes}" не заповнене`);
    }

    const fieldsToVerify: (keyof FieldVerificationStatus)[] = ['appealType', 'ticketType', 'addressText', 'coordinates', 'notes'];

    for (const field of fieldsToVerify) {
      if (this.isFieldLowConfidence(field) && !this.verifications[field]) {
        errors.push(`Не підтверджено поле з низькою впевненістю: "${wsnConfig.FIELD_LABELS[field]}"`);
      }
    }

    if (!this.result.requiresTicketRegistration && !this.forceRegistrationUnlocked) {
      errors.push('Звернення не потребує створення заявки (натисніть "Створити примусово" для розблокування)');
    }

    return errors;
  }

  public async submitTicket(): Promise<boolean> {
    if (!this.isValid()) {
      return false;
    }

    try {
      // 1. Get new ticket template from Forland
      const template = await forlandApiService.createNewUnit(wsnConfig.CLASS_ID);
      
      if (!template) {
        console.error('Failed to create new unit template');
        return false;
      }

      // 2. Merge template properties with form data, preserving all system fields
      const templateEditProperties = template.Edit?.Properties || {};
      const templateInitProperties = template.Init?.Properties || {};

      // Get IDs for dropdown values instead of text
      const appealTypeId = dropdownDataService.getAppealTypeId(this.formData.appealType);
      const ticketTypeId = dropdownDataService.getTicketTypeId(this.formData.ticketType);

      console.log('Form data appeal type:', this.formData.appealType, 'ID:', appealTypeId);
      console.log('Form data ticket type:', this.formData.ticketType, 'ID:', ticketTypeId);
      
      // Use ID for both appeal type and ticket type
      const appealTypeValue = appealTypeId ?? this.formData.appealType;
      const ticketTypeValue = ticketTypeId ?? this.formData.ticketType;

      // Format coordinates for Forland API (WKT format)
      const formattedCoordinates: string | Record<string, unknown> = (() => {
        const coords = this.formData.coordinates;
        if (!coords || !coords.includes(',')) return coords;

        const [lat, lng] = coords.split(',').map(c => c.trim());
        const latNum = Number(lat);
        const lngNum = Number(lng);

        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
          return {
            wkt: `POINT(${lngNum} ${latNum})`,
            center: null,
            needProcessing: true,
            z: null
          };
        }
        
        return coords;
      })();

      // Create the merged properties object
      const mergedProperties: Record<string, unknown> = {
        // Preserve all system fields from template first
        ...templateInitProperties,
        ...templateEditProperties,
        
        // Override with form data (user-entered fields)
        // Appeal type uses text value, ticket type uses ID
        [wsnConfig.PROPERTIES.APPEAL_TYPE]: appealTypeValue,
        [wsnConfig.PROPERTIES.TICKET_TYPE]: ticketTypeValue,
        [wsnConfig.PROPERTIES.APPLICANT_NAME]: this.formData.applicantName,
        [wsnConfig.PROPERTIES.APPLICANT_ADDRESS]: this.formData.applicantAddress,
        [wsnConfig.PROPERTIES.ADDRESS_TEXT]: this.formData.addressText,
        [wsnConfig.PROPERTIES.COORDINATES]: formattedCoordinates,
        [wsnConfig.PROPERTIES.PHONE_NUMBER]: this.formData.phoneNumber,
        [wsnConfig.PROPERTIES.INCIDENT_DATE_TIME]: formatForlandDateTimeMinutePrecision(new Date(this.formData.incidentDateTime)),
        [wsnConfig.PROPERTIES.NOTES]: this.formData.notes
      };

      // Ensure Init arrays are preserved (they are required)
      const initArrays = ['f1268', 'f1954', 'f1974', 'f_221'];
      for (const arrayField of initArrays) {
        if (templateInitProperties[arrayField] !== undefined) {
          mergedProperties[arrayField] = templateInitProperties[arrayField];
        } else {
          // Initialize empty arrays if not present in template
          mergedProperties[arrayField] = [];
        }
      }

      // Override system date fields with current data (use minute precision)
      mergedProperties['f1258'] = formatForlandDateTimeMinutePrecision(new Date()); // Current time for f1258
      mergedProperties['f_297'] = formatForlandDateTimeMinutePrecisionWithTimezone(new Date()); // Document date with timezone
      
      // Ensure f_296 (autofill) is preserved from template
      if (templateEditProperties['f_296']) {
        mergedProperties['f_296'] = templateEditProperties['f_296'];
      }
      
      // Ensure f1265 (system field) is preserved from template
      if (templateEditProperties['f1265']) {
        mergedProperties['f1265'] = templateEditProperties['f1265'];
      }

      // 3. Prepare the save request
      const saveRequest = {
        units: [{
          ID: template.ID || -15, // Use template ID or default to -15 for new ticket
          Title: 'Заявка № [AUTO] (AI-агент)',
          MetaID: wsnConfig.CLASS_ID,
          LogID: template.LogID,
          Init: template.Init,
          Edit: {
            Properties: mergedProperties,
            StateID: wsnConfig.DEFAULT_STATUS_ID
          }
        }],
        onlyAllSave: true
      };

      // 4. Save the ticket to Forland
      console.log('Template received:', template);
      console.log('Merged properties:', mergedProperties);
      console.log('Save request payload:', JSON.stringify(saveRequest, null, 2));
      const saveResult = await forlandApiService.saveTicket(saveRequest);
      console.log('Save response:', saveResult);

      if (saveResult && saveResult.HttpStatus !== 500) {
        this.isSubmitted = true;
        this.notify();
        return true;
      }

      // Handle error cases
      if (saveResult?.HttpStatus === 500) {
        console.error('Forland API error:', saveResult.Title, saveResult.Error);
        // Could add user-friendly error message parsing here
      }

      return false;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      return false;
    }
  }

  public resetSubmission(): void {
    this.isSubmitted = false;
    this.notify();
  }
}
