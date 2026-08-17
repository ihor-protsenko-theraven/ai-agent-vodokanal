export interface WsnTicketData {
  appealType: string;         // WSN Property f1958 (Тип звернення)
  ticketType: string;         // WSN Property f1972 (Тип заявки)
  applicantName?: string;     // WSN Property f1961 (ПІБ заявника)
  applicantAddress?: string;  // WSN Property f1960 (Адреса проживання)
  addressText: string;        // WSN Property f_389 (Текст адреси)
  coordinates: string;        // WSN Property f_420 (Координати) - MANDATORY
  phoneNumber: string;        // WSN Property f1981 (Телефон заявника)
  incidentDateTime: Date | string; // WSN Property f1258 (Дата й час аварії)
  notes: string;              // WSN Property f328 (Примітки) - MANDATORY
  // System fields (usually auto-filled by Forland)
  autofillField?: string;     // WSN Property f_296
  documentDate?: Date | string; // WSN Property f_297
}

export interface ConfidenceScores {
  speechRecognition: number;
  classification: number;
  addressExtraction: number;
  geocoding: number;
}

export interface TicketDuplicate {
  ticketId: string;
  matchReason: 'ADDRESS_MATCH' | 'COORDINATES_MATCH' | 'APPEAL_TYPE_MATCH';
  createdDate?: string;
  status?: string;
  addressText?: string;
  appealType?: string;
}

export interface AgentProcessingResult {
  callId: string;
  transcript: string;
  ticket: Partial<WsnTicketData>;
  confidence: ConfidenceScores;
  requiresManualReview: boolean;
  suggestedQuestions: string[];
  duplicatesFound: TicketDuplicate[];
  requiresTicketRegistration: boolean;
}

export type ClarificationMode = 'TEXT_HINTS' | 'VOICE_DIALOG';

export interface FieldVerificationStatus {
  appealType: boolean;
  ticketType: boolean;
  addressText: boolean;
  coordinates: boolean;
  notes: boolean;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  data: AgentProcessingResult;
}

export interface UserSession {
  username: string;
  displayName: string;
  role: string;
  operatorId: string;
}
