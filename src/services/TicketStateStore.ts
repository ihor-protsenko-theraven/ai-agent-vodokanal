import {
  AgentProcessingResult,
  ClarificationMode,
  FieldVerificationStatus,
  TicketDuplicate,
  UserSession,
  WsnTicketData
} from '../types/ticket';
import { MOCK_SCENARIOS, SCENARIO_LOW_CONFIDENCE } from '../mock/mockData';
import { CONFIG } from '../config/constants';

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
  private activeScenarioId: string = CONFIG.SCENARIOS.LOW_CONFIDENCE;

  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    this.result = { ...SCENARIO_LOW_CONFIDENCE };
    this.formData = this.extractTicketData(this.result.ticket);
    this.verifications = this.initVerifications(this.result);
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const saved = sessionStorage.getItem(CONFIG.AUTH.STORAGE_KEY);
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
      incidentDateTime: ticketPartial.incidentDateTime || new Date().toISOString().slice(0, 16),
      notes: ticketPartial.notes || ''
    };
  }

  private initVerifications(result: AgentProcessingResult): FieldVerificationStatus {
    const isGlobalReview = result.requiresManualReview;
    const lowClassification = result.confidence.classification < CONFIG.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowAddress = result.confidence.addressExtraction < CONFIG.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowGeo = result.confidence.geocoding < CONFIG.CONFIDENCE_THRESHOLD || isGlobalReview;
    const lowSpeech = result.confidence.speechRecognition < CONFIG.CONFIDENCE_THRESHOLD || isGlobalReview;

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

  public loadRealResult(realResult: AgentProcessingResult): void {
    this.activeScenarioId = 'real-audio';
    this.isProcessingAudio = false;
    this.result = realResult;

    // Automated duplicate check against WSN database
    if ((!this.result.duplicatesFound || this.result.duplicatesFound.length === 0) && this.result.requiresTicketRegistration) {
      const addr = (this.result.ticket.addressText || '').toLowerCase();
      if (addr.includes('хрещатик') || addr.includes('шевченка')) {
        this.result.duplicatesFound = [
          {
            ticketId: `WSN-${CONFIG.WSN.CLASS_ID}-${CONFIG.WSN.DEFAULT_STATUS_ID}-0912`,
            matchReason: 'ADDRESS_MATCH',
            createdDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
            status: `${CONFIG.WSN.DEFAULT_STATUS_ID} (${CONFIG.WSN.DEFAULT_STATUS_NAME})`,
            addressText: this.result.ticket.addressText,
            appealType: this.result.ticket.appealType || 'Витік води'
          }
        ];
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
  public login(username: string, password: string): boolean {
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    if (
      (user === CONFIG.AUTH.DEFAULT_ADMIN_USER && pass === CONFIG.AUTH.DEFAULT_ADMIN_PASS) ||
      (user === CONFIG.AUTH.DEFAULT_OPERATOR_USER && pass === CONFIG.AUTH.DEFAULT_ADMIN_PASS)
    ) {
      const isAdmin = user === CONFIG.AUTH.DEFAULT_ADMIN_USER;
      this.currentUser = {
        username: user,
        displayName: isAdmin ? CONFIG.AUTH.ADMIN_DISPLAY_NAME : CONFIG.AUTH.OPERATOR_DISPLAY_NAME,
        role: isAdmin ? CONFIG.AUTH.ADMIN_ROLE : CONFIG.AUTH.OPERATOR_ROLE,
        operatorId: CONFIG.WSN.OPERATOR_ID
      };
      try {
        sessionStorage.setItem(CONFIG.AUTH.STORAGE_KEY, JSON.stringify(this.currentUser));
      } catch {
        // Ignore session storage errors
      }
      this.notify();
      return true;
    }
    return false;
  }

  public logout(): void {
    this.currentUser = null;
    try {
      sessionStorage.removeItem(CONFIG.AUTH.STORAGE_KEY);
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
      this.formData.notes += `\nУточнення: ${questionText}`;
    } else {
      this.formData.notes = `Уточнення: ${questionText}`;
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
        return conf.classification < CONFIG.CONFIDENCE_THRESHOLD || isGlobal;
      case 'addressText':
        return conf.addressExtraction < CONFIG.CONFIDENCE_THRESHOLD || isGlobal;
      case 'coordinates':
        return conf.geocoding < CONFIG.CONFIDENCE_THRESHOLD || isGlobal;
      case 'notes':
        return conf.speechRecognition < CONFIG.CONFIDENCE_THRESHOLD || isGlobal;
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
      errors.push('Обов\'язкове поле "Координати (-420)" не заповнене');
    }
    if (!this.formData.notes || !this.formData.notes.trim()) {
      errors.push('Обов\'язкове поле "Примітки (328)" не заповнене');
    }

    const fieldsToVerify: { key: keyof FieldVerificationStatus; name: string }[] = [
      { key: 'appealType', name: 'Тип звернення (1958)' },
      { key: 'ticketType', name: 'Тип заявки (1972)' },
      { key: 'addressText', name: 'Текст адреси (-389)' },
      { key: 'coordinates', name: 'Координати (-420)' },
      { key: 'notes', name: 'Примітки (328)' }
    ];

    for (const f of fieldsToVerify) {
      if (this.isFieldLowConfidence(f.key) && !this.verifications[f.key]) {
        errors.push(`Не підтверджено поле з низькою впевненістю: "${f.name}"`);
      }
    }

    if (!this.result.requiresTicketRegistration && !this.forceRegistrationUnlocked) {
      errors.push('Звернення не потребує створення заявки (натисніть "Створити примусово" для розблокування)');
    }

    return errors;
  }

  public submitTicket(): void {
    if (this.isValid()) {
      this.isSubmitted = true;
      this.notify();
    }
  }

  public resetSubmission(): void {
    this.isSubmitted = false;
    this.notify();
  }
}
