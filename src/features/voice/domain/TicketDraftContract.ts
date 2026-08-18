import { ConfidenceScores, WsnTicketData } from '@/shared/types';
import { wsnConfig } from '@/shared/config';
import { DEFAULT_TICKET_DRAFT_CATALOG, TicketDraftCatalog } from './TicketDraftCatalog';

type ModelTicketFields = Required<Pick<
  WsnTicketData,
  | 'appealType'
  | 'ticketType'
  | 'applicantName'
  | 'applicantAddress'
  | 'addressText'
  | 'coordinates'
  | 'phoneNumber'
  | 'incidentDateTime'
  | 'notes'
>>;

export interface GeminiTicketDraft {
  ticket: ModelTicketFields;
  confidence: ConfidenceScores;
  requiresManualReview: boolean;
  requiresTicketRegistration: boolean;
  suggestedQuestions: string[];
  duplicatesFound: [];
}

const TICKET_TYPE_BY_APPEAL: Readonly<Record<string, string>> = {
  'Витік води': 'Аварійні роботи',
  'Витік каналізації': 'Аварійні роботи',
  'Закупорка': 'Аварійні роботи',
  'Відсутність Води': 'Аварійні роботи',
  'Низький тиск води': 'Аварійні роботи',
  'Брудна вода': 'Аварійні роботи',
  'Несправність засувки': 'Аварійні роботи',
  'Провал': 'Благоустрій',
  'Відкритий колодязь': 'Благоустрій',
  'Пошкоджена кришка колодязя': 'Благоустрій',
  'Благоустрій': 'Благоустрій',
  'Планові роботи': 'Планові роботи',
  'Встановлення лічильника': 'Планові роботи',
  'Заміна трубопроводу': 'Планові роботи',
  [wsnConfig.CONSULTATION_APPEAL_TYPE]: 'Планові роботи'
};

const MAX_FIELD_LENGTH = 4_000;
const UKRAINIAN_PHONE_PATTERN = /^\+380\d{9}$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const NOTES_PREFIX = 'Надиктовано оператором:';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length <= MAX_FIELD_LENGTH ? value.trim() : null;
}

function readScore(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function isValidIncidentDateTime(value: string): boolean {
  return ISO_DATE_TIME_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

/**
 * Validates the untrusted Gemini response before it reaches form state.
 * JSON-mode guarantees syntax, not semantic correctness, so this is kept as a
 * runtime boundary rather than a TypeScript-only assertion.
 */
export function decodeGeminiTicketDraft(
  value: unknown,
  catalog: TicketDraftCatalog = DEFAULT_TICKET_DRAFT_CATALOG
): GeminiTicketDraft | null {
  const root = asRecord(value);
  const ticket = root && asRecord(root.ticket);
  const confidence = root && asRecord(root.confidence);
  if (!root || !ticket || !confidence) return null;

  const appealType = readString(ticket, 'appealType');
  const ticketType = readString(ticket, 'ticketType');
  const applicantName = readString(ticket, 'applicantName');
  const applicantAddress = readString(ticket, 'applicantAddress');
  const addressText = readString(ticket, 'addressText');
  const coordinates = readString(ticket, 'coordinates');
  const phoneNumber = readString(ticket, 'phoneNumber');
  const incidentDateTime = readString(ticket, 'incidentDateTime');
  const notes = readString(ticket, 'notes');
  const speechRecognition = readScore(confidence, 'speechRecognition');
  const classification = readScore(confidence, 'classification');
  const addressExtraction = readScore(confidence, 'addressExtraction');
  const geocoding = readScore(confidence, 'geocoding');
  const hasInvalidPhoneNumber = phoneNumber !== null && phoneNumber !== '' && !UKRAINIAN_PHONE_PATTERN.test(phoneNumber);

  if (
    !appealType || !catalog.appealTypes.includes(appealType) ||
    !ticketType || !catalog.ticketTypes.includes(ticketType) ||
    (TICKET_TYPE_BY_APPEAL[appealType] != null && TICKET_TYPE_BY_APPEAL[appealType] !== ticketType) ||
    applicantName === null || applicantAddress === null || addressText === null ||
    coordinates === null || phoneNumber === null || notes === null || !notes.startsWith(NOTES_PREFIX) ||
    !incidentDateTime || !isValidIncidentDateTime(incidentDateTime) ||
    speechRecognition === null || classification === null ||
    addressExtraction === null || geocoding === null ||
    typeof root.requiresManualReview !== 'boolean' ||
    typeof root.requiresTicketRegistration !== 'boolean' ||
    !Array.isArray(root.suggestedQuestions) || root.suggestedQuestions.length > 3 ||
    !root.suggestedQuestions.every((question) => typeof question === 'string' && question.length <= 500) ||
    !Array.isArray(root.duplicatesFound) || root.duplicatesFound.length !== 0
  ) {
    return null;
  }

  const hasUnknownAppealMapping = TICKET_TYPE_BY_APPEAL[appealType] == null;
  const suggestedQuestions = root.suggestedQuestions.map((question) => question.trim());
  if (hasInvalidPhoneNumber && suggestedQuestions.length < 3) {
    suggestedQuestions.push('Уточніть номер телефону заявника.');
  }
  if (hasUnknownAppealMapping && suggestedQuestions.length < 3) {
    suggestedQuestions.push('Перевірте відповідність типу звернення та типу заявки в WSN.');
  }

  return {
    ticket: {
      appealType,
      ticketType,
      applicantName,
      applicantAddress,
      addressText,
      coordinates,
      // Do not discard an otherwise useful model response because it guessed
      // a malformed phone number. A blank field plus manual review is safer.
      phoneNumber: hasInvalidPhoneNumber ? '' : phoneNumber,
      incidentDateTime,
      notes
    },
    confidence: {
      speechRecognition,
      classification,
      addressExtraction,
      geocoding
    },
    requiresManualReview: root.requiresManualReview || hasInvalidPhoneNumber || hasUnknownAppealMapping,
    requiresTicketRegistration: root.requiresTicketRegistration,
    suggestedQuestions,
    duplicatesFound: []
  };
}
