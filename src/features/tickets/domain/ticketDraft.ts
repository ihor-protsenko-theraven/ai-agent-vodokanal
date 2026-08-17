import {
  AgentProcessingResult,
  FieldVerificationStatus,
  WsnTicketData
} from '@/shared/types';
import { aiConfig, wsnConfig } from '@/shared/config';
import { formatDateTimeInput, generateCallId } from '@/shared/utils/wsn';

export function toTicketFormData(ticketPartial: Partial<WsnTicketData>): WsnTicketData {
  const incidentDateTime = ticketPartial.incidentDateTime;
  return {
    appealType: ticketPartial.appealType ?? '',
    ticketType: ticketPartial.ticketType ?? '',
    applicantName: ticketPartial.applicantName ?? '',
    applicantAddress: ticketPartial.applicantAddress ?? '',
    addressText: ticketPartial.addressText ?? '',
    coordinates: ticketPartial.coordinates ?? '',
    phoneNumber: ticketPartial.phoneNumber ?? '',
    incidentDateTime: typeof incidentDateTime === 'string' && incidentDateTime.trim()
      ? incidentDateTime
      : incidentDateTime instanceof Date
      ? incidentDateTime
      : formatDateTimeInput(new Date()),
    notes: ticketPartial.notes ?? ''
  };
}

export function createEmptyTicketResult(): AgentProcessingResult {
  return {
    callId: generateCallId('NEW'),
    transcript: '',
    ticket: {
      appealType: '',
      ticketType: '',
      applicantName: '',
      applicantAddress: '',
      addressText: '',
      coordinates: '',
      phoneNumber: '',
      incidentDateTime: formatDateTimeInput(new Date()),
      notes: ''
    },
    confidence: {
      speechRecognition: 1,
      classification: 1,
      addressExtraction: 1,
      geocoding: 1
    },
    requiresManualReview: false,
    suggestedQuestions: [],
    duplicatesFound: [],
    requiresTicketRegistration: true
  };
}

export function isLowConfidenceField(
  result: AgentProcessingResult,
  field: keyof FieldVerificationStatus
): boolean {
  const confidence = result.confidence;
  const requiresReview = result.requiresManualReview;

  switch (field) {
    case 'appealType':
    case 'ticketType':
      return confidence.classification < aiConfig.CONFIDENCE_THRESHOLD || requiresReview;
    case 'addressText':
      return confidence.addressExtraction < aiConfig.CONFIDENCE_THRESHOLD || requiresReview;
    case 'coordinates':
      // An exact point selected from a geocoder is independently verifiable,
      // even when another field still requires the operator's review.
      return confidence.geocoding < aiConfig.CONFIDENCE_THRESHOLD;
    case 'notes':
      return confidence.speechRecognition < aiConfig.CONFIDENCE_THRESHOLD || requiresReview;
  }
}

export function getInitialVerifications(result: AgentProcessingResult): FieldVerificationStatus {
  return {
    appealType: !isLowConfidenceField(result, 'appealType'),
    ticketType: !isLowConfidenceField(result, 'ticketType'),
    addressText: !isLowConfidenceField(result, 'addressText'),
    coordinates: !isLowConfidenceField(result, 'coordinates'),
    notes: !isLowConfidenceField(result, 'notes')
  };
}

export interface TicketValidationInput {
  formData: WsnTicketData;
  result: AgentProcessingResult;
  verifications: FieldVerificationStatus;
  forceRegistrationUnlocked: boolean;
}

export function getTicketValidationErrors(input: TicketValidationInput): string[] {
  const { formData, result, verifications, forceRegistrationUnlocked } = input;
  const errors: string[] = [];

  if (!formData.coordinates.trim()) {
    errors.push(`Обов’язкове поле "${wsnConfig.FIELD_LABELS.coordinates}" не заповнене`);
  }
  if (!formData.notes.trim()) {
    errors.push(`Обов’язкове поле "${wsnConfig.FIELD_LABELS.notes}" не заповнене`);
  }

  const fieldsToVerify: (keyof FieldVerificationStatus)[] = [
    'appealType',
    'ticketType',
    'addressText',
    'coordinates',
    'notes'
  ];
  for (const field of fieldsToVerify) {
    if (isLowConfidenceField(result, field) && !verifications[field]) {
      errors.push(`Не підтверджено поле з низькою впевненістю: "${wsnConfig.FIELD_LABELS[field]}"`);
    }
  }

  if (!result.requiresTicketRegistration && !forceRegistrationUnlocked) {
    errors.push('Звернення не потребує створення заявки (натисніть "Створити примусово" для розблокування)');
  }

  if (result.requiresTicketRegistration && result.duplicateCheckStatus === 'UNAVAILABLE') {
    errors.push('Не вдалося перевірити дублікати в Forland. Повторіть перевірку після відновлення з’єднання.');
  }

  if (result.requiresTicketRegistration && formData.addressText.trim() && result.duplicateCheckStatus === 'REQUIRED') {
    errors.push('Адресу змінено. Повторіть перевірку можливих дублікатів у Forland.');
  }

  if (result.requiresTicketRegistration && result.duplicatesFound.length > 0) {
    errors.push('Знайдено можливі дублікати за адресою або координатами WSN. Створення призупинено до ручної перевірки.');
  }

  return errors;
}
