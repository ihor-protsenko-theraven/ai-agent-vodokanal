export interface WsnTicketData {
  appealType: string;         // WSN Property 1958 (Тип звернення)
  ticketType: string;         // WSN Property 1972 (Тип заявки)
  applicantName?: string;     // WSN Property 1961 (ПІБ заявника)
  applicantAddress?: string;  // WSN Property 1960 (Адреса проживання)
  addressText: string;        // WSN Property -389 (Текст адреси)
  coordinates: string;        // WSN Property -420 (Координати) - MANDATORY
  phoneNumber: string;        // WSN Property 1981 (Телефон заявника)
  incidentDateTime: Date | string; // WSN Property 1258 (Дата й час аварії)
  notes: string;              // WSN Property 328 (Примітки) - MANDATORY
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
