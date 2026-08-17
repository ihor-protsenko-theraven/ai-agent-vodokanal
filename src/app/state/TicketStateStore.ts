import {
  AgentProcessingResult,
  ClarificationMode,
  FieldVerificationStatus,
  TicketDuplicate,
  UnclosedTicketSummary,
  UserSession,
  WsnTicketData
} from '@/shared/types';
import { MOCK_SCENARIOS, SCENARIO_LOW_CONFIDENCE } from '@/features/tickets/testing/mock/mockData';
import { apiConfig, authConfig, aiConfig, wsnConfig, uiConfig } from '@/shared/config';
import { forlandApiService } from '@/features/forland/infrastructure/ForlandApiService';
import { dropdownDataService } from '@/features/forland/application/DropdownDataService';
import { DuplicateFinder } from '@/features/tickets/domain/DuplicateFinder';
import { getSavedUnit, isSaveSuccessful } from '@/features/forland/domain/saveResult';
import { CreateNewUnitResponse, SavedUnit } from '@/shared/types';
import { sortUnclosedTickets, UnclosedTicketSort } from '@/features/forland/domain/forlandTicketSummary';
import { buildTicketSaveRequest } from '@/features/forland/application/buildTicketSaveRequest';
import {
  createEmptyTicketResult,
  getInitialVerifications,
  getTicketValidationErrors,
  isLowConfidenceField,
  toTicketFormData
} from '@/features/tickets/domain/ticketDraft';

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
  private submittedTicket: SavedUnit | null = null;
  private newTicketTemplate: CreateNewUnitResponse | null = null;
  private isPreparingNewTicket: boolean = false;
  private isCheckingDuplicates: boolean = false;
  private isProcessingAudio: boolean = false;
  private activeScenarioId: string = aiConfig.SCENARIOS.LOW_CONFIDENCE;
  private unclosedTickets: UnclosedTicketSummary[] = [];
  private unclosedTicketsUpdatedAt: Date | null = null;
  private unclosedTicketsError: string | null = null;
  private isLoadingUnclosedTickets: boolean = false;
  private isUnclosedTicketsPanelOpen: boolean = false;
  private unclosedTicketsSort: UnclosedTicketSort = 'newest';
  private unclosedTicketsRequest: Promise<boolean> | null = null;

  private duplicateFinder = new DuplicateFinder();

  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    this.result = { ...SCENARIO_LOW_CONFIDENCE };
    this.formData = toTicketFormData(this.result.ticket);
    this.verifications = getInitialVerifications(this.result);
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
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        // A rendering failure in one panel must not interrupt an in-flight
        // Forland or geocoding operation triggered by another state change.
        console.error('Ticket state listener failed:', error);
      }
    });
  }

  public loadScenario(scenarioId: string): void {
    const found = MOCK_SCENARIOS.find(s => s.id === scenarioId);
    if (found) {
      this.activeScenarioId = scenarioId;
      this.result = JSON.parse(JSON.stringify(found.data));
      this.formData = toTicketFormData(this.result.ticket);
      this.verifications = getInitialVerifications(this.result);
      this.forceRegistrationUnlocked = false;
      this.isCallIntercepted = false;
      this.selectedDuplicate = null;
      this.isSubmitted = false;
      this.submittedTicket = null;
      this.newTicketTemplate = null;
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
    this.formData = toTicketFormData(this.result.ticket);

    // Always replace model/local duplicate hints with the authenticated Forland
    // check. A failed check must never fabricate a duplicate ticket.
    this.result.duplicatesFound = [];
    if (this.result.requiresTicketRegistration) {
      await this.checkDuplicates(false);
    }

    this.verifications = getInitialVerifications(this.result);
    this.forceRegistrationUnlocked = false;
    this.isCallIntercepted = false;
    this.selectedDuplicate = null;
    this.isSubmitted = false;
    this.submittedTicket = null;
    this.newTicketTemplate = null;
    this.notify();
  }

  // Getters
  public async login(username: string, password: string): Promise<boolean> {
    const user = username.trim();
    const pass = password.trim();

    if (!user || !pass) {
      return false;
    }

    // Authenticate exactly as the operator entered. There is intentionally no
    // client-side fallback account: the Forland session is the source of truth.
    const forlandLoginSuccess = await forlandApiService.login(user, pass);

    if (forlandLoginSuccess) {
      this.currentUser = {
        username: user,
        displayName: user,
        role: authConfig.AUTHENTICATED_ROLE,
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
    this.unclosedTickets = [];
    this.unclosedTicketsUpdatedAt = null;
    this.unclosedTicketsError = null;
    this.isUnclosedTicketsPanelOpen = false;
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

  public getSubmittedTicketId(): number | null {
    return this.submittedTicket?.ID ?? null;
  }

  public getSubmittedTicket(): SavedUnit | null {
    return this.submittedTicket;
  }

  public getIsProcessingAudio(): boolean {
    return this.isProcessingAudio;
  }

  public getIsPreparingNewTicket(): boolean {
    return this.isPreparingNewTicket;
  }

  public getIsCheckingDuplicates(): boolean {
    return this.isCheckingDuplicates;
  }

  public getUnclosedTickets(): readonly UnclosedTicketSummary[] {
    return this.unclosedTickets;
  }

  public getSortedUnclosedTickets(): readonly UnclosedTicketSummary[] {
    return sortUnclosedTickets(this.unclosedTickets, this.unclosedTicketsSort);
  }

  public getUnclosedTicketsSort(): UnclosedTicketSort {
    return this.unclosedTicketsSort;
  }

  public setUnclosedTicketsSort(sort: UnclosedTicketSort): void {
    if (this.unclosedTicketsSort === sort) return;
    this.unclosedTicketsSort = sort;
    this.notify();
  }

  public getUnclosedTicketsUpdatedAt(): Date | null {
    return this.unclosedTicketsUpdatedAt;
  }

  public getUnclosedTicketsError(): string | null {
    return this.unclosedTicketsError;
  }

  public getIsLoadingUnclosedTickets(): boolean {
    return this.isLoadingUnclosedTickets;
  }

  public getIsUnclosedTicketsPanelOpen(): boolean {
    return this.isUnclosedTicketsPanelOpen;
  }

  public getActiveScenarioId(): string {
    return this.activeScenarioId;
  }

  public async toggleUnclosedTicketsPanel(): Promise<void> {
    this.isUnclosedTicketsPanelOpen = !this.isUnclosedTicketsPanelOpen;
    this.notify();

    if (this.isUnclosedTicketsPanelOpen && this.unclosedTicketsUpdatedAt === null) {
      await this.refreshUnclosedTickets();
    }
  }

  public async refreshUnclosedTickets(notify: boolean = true): Promise<boolean> {
    if (this.unclosedTicketsRequest) {
      return this.unclosedTicketsRequest;
    }

    const request = (async () => {
      this.isLoadingUnclosedTickets = true;
      this.unclosedTicketsError = null;
      if (notify) {
        this.notify();
      }

      try {
        const tickets = await forlandApiService.getUnclosedTickets(
          wsnConfig.CLASS_ID,
          wsnConfig.UNCLOSED_STATE_IDS
        );
        if (tickets === null) {
          throw new Error('Forland did not return unclosed tickets');
        }

        this.unclosedTickets = tickets;
        this.unclosedTicketsUpdatedAt = new Date();
        return true;
      } catch (error) {
        console.error('Unable to load unclosed tickets from Forland:', error);
        const startCommand = apiConfig.FORLAND.PROXY_BASE_PATH === '/api/forland'
          ? 'npx vercel dev'
          : 'npm run dev';
        this.unclosedTicketsError = `Не вдалося з’єднатися з проксі Forland (${apiConfig.FORLAND.PROXY_BASE_PATH}). Перевірте, що запущено ${startCommand}, і оновіть сторінку.`;
        return false;
      } finally {
        this.isLoadingUnclosedTickets = false;
        if (notify) {
          this.notify();
        }
      }
    })();

    this.unclosedTicketsRequest = request;
    try {
      return await request;
    } finally {
      this.unclosedTicketsRequest = null;
    }
  }

  public async createNewTicket(): Promise<boolean> {
    if (this.isPreparingNewTicket) {
      return false;
    }

    this.isPreparingNewTicket = true;
    this.notify();

    try {
      const template = await forlandApiService.createNewUnit(wsnConfig.CLASS_ID);
      if (!template) {
        return false;
      }

      this.newTicketTemplate = template;
      this.activeScenarioId = aiConfig.SCENARIOS.REAL_AUDIO;
      this.result = createEmptyTicketResult();
      this.formData = toTicketFormData(this.result.ticket);
      this.verifications = getInitialVerifications(this.result);
      this.forceRegistrationUnlocked = false;
      this.isCallIntercepted = false;
      this.selectedDuplicate = null;
      this.isSubmitted = false;
      this.submittedTicket = null;
      return true;
    } catch (error) {
      console.error('Failed to prepare a new Forland ticket:', error);
      return false;
    } finally {
      this.isPreparingNewTicket = false;
      this.notify();
    }
  }

  // Setters & Actions
  public updateFormField<K extends keyof WsnTicketData>(field: K, value: WsnTicketData[K], notify: boolean = true): void {
    this.formData[field] = value;
    if (field === 'addressText') {
      this.result.duplicatesFound = [];
      this.result.duplicateCheckStatus = String(value).trim() ? 'REQUIRED' : undefined;
    }
    if (notify) {
      this.notify();
    }
  }

  /** Apply coordinates returned by an address provider, rather than unverified text input. */
  public applyGeocodedAddress(addressText: string | null | undefined, coordinates: string): void {
    if (addressText?.trim()) {
      this.formData.addressText = addressText.trim();
      this.result.duplicatesFound = [];
      this.result.duplicateCheckStatus = 'REQUIRED';
    }

    this.formData.coordinates = coordinates;
    this.result.confidence.geocoding = Math.max(
      this.result.confidence.geocoding,
      aiConfig.CONFIDENCE_SCORES.GEOCODING_FULL
    );
    this.verifications.coordinates = true;
    this.notify();
  }

  public async checkDuplicates(notify: boolean = true): Promise<boolean> {
    if (!this.result.requiresTicketRegistration || !this.formData.addressText.trim()) {
      return true;
    }

    this.isCheckingDuplicates = true;
    this.result.duplicatesFound = [];
    if (notify) {
      this.notify();
    }

    try {
      const listLoaded = await this.refreshUnclosedTickets(notify);
      if (!listLoaded) {
        throw new Error('Forland did not return unclosed tickets');
      }

      this.result.duplicatesFound = this.duplicateFinder.findPotentialDuplicates({
        addressText: this.formData.addressText,
        coordinates: this.formData.coordinates,
        searchText: this.formData.addressText,
        appealType: this.formData.appealType || wsnConfig.OPTIONS.APPEAL_TYPES[0]
      }, this.unclosedTickets);
      this.result.duplicateCheckStatus = 'COMPLETED';
      return true;
    } catch (error) {
      console.error('Duplicate check against Forland is unavailable:', error);
      this.result.duplicateCheckStatus = 'UNAVAILABLE';
      return false;
    } finally {
      this.isCheckingDuplicates = false;
      if (notify) {
        this.notify();
      }
    }
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
    return isLowConfidenceField(this.result, field);
  }

  // Validation rules (Requirement 4)
  public isValid(): boolean {
    return this.getValidationErrors().length === 0;
  }

  public getValidationErrors(): string[] {
    return getTicketValidationErrors({
      formData: this.formData,
      result: this.result,
      verifications: this.verifications,
      forceRegistrationUnlocked: this.forceRegistrationUnlocked
    });
  }

  public async submitTicket(): Promise<boolean> {
    if (!this.isValid()) {
      return false;
    }

    try {
      // 1. Reuse the template prepared for an explicit "new ticket" flow.
      // Audio-originated tickets still obtain a template lazily at submit time.
      const template = this.newTicketTemplate ?? await forlandApiService.createNewUnit(wsnConfig.CLASS_ID);
      
      if (!template) {
        console.error('Failed to create new unit template');
        return false;
      }

      // 2. Convert the editable draft into the Forland contract. The mapping is
      // kept outside the UI store, so it can be tested independently.
      const saveRequest = buildTicketSaveRequest({
        template,
        formData: this.formData,
        appealTypeId: dropdownDataService.getAppealTypeId(this.formData.appealType),
        ticketTypeId: dropdownDataService.getTicketTypeId(this.formData.ticketType)
      });

      // 3. Save the ticket to Forland. Do not log ticket payloads: they contain PII.
      const saveResult = await forlandApiService.saveTicket(saveRequest);

      if (isSaveSuccessful(saveResult)) {
        this.isSubmitted = true;
        this.submittedTicket = getSavedUnit(saveResult);
        this.newTicketTemplate = null;
        this.notify();
        return true;
      }

      console.error('Forland API rejected ticket save:', saveResult?.transportStatus ?? saveResult?.HttpStatus ?? 'no response');

      return false;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      return false;
    }
  }

  public resetSubmission(): void {
    this.isSubmitted = false;
    this.submittedTicket = null;
    this.notify();
  }
}
