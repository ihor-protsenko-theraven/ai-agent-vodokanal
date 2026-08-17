import { describe, expect, it } from 'vitest';
import {
  createEmptyTicketResult,
  getInitialVerifications,
  getTicketValidationErrors,
  toTicketFormData
} from './ticketDraft';

describe('ticket draft rules', () => {
  it('creates an empty, registration-ready draft without invented applicant data', () => {
    const result = createEmptyTicketResult();

    expect(result.requiresTicketRegistration).toBe(true);
    expect(result.ticket).toMatchObject({ applicantName: '', phoneNumber: '', notes: '' });
    expect(result.duplicatesFound).toEqual([]);
  });

  it('fills the incident time when an AI draft returns an empty value', () => {
    const formData = toTicketFormData({ incidentDateTime: '' });

    expect(formData.incidentDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('blocks saving when the duplicate check is unavailable', () => {
    const result = createEmptyTicketResult();
    result.ticket.coordinates = '50.4501, 30.5234';
    result.ticket.notes = 'Тестова заявка';
    result.duplicateCheckStatus = 'UNAVAILABLE';
    const formData = toTicketFormData(result.ticket);

    expect(getTicketValidationErrors({
      formData,
      result,
      verifications: getInitialVerifications(result),
      forceRegistrationUnlocked: false
    })).toContain('Не вдалося перевірити дублікати в Forland. Повторіть перевірку після відновлення з’єднання.');
  });

  it('requires a fresh duplicate check after the address changes', () => {
    const result = createEmptyTicketResult();
    result.ticket.coordinates = '50.4501, 30.5234';
    result.ticket.addressText = 'вул. Хрещатик, 15';
    result.ticket.notes = 'Тестова заявка';
    result.duplicateCheckStatus = 'REQUIRED';

    expect(getTicketValidationErrors({
      formData: toTicketFormData(result.ticket),
      result,
      verifications: getInitialVerifications(result),
      forceRegistrationUnlocked: false
    })).toContain('Адресу змінено. Повторіть перевірку можливих дублікатів у Forland.');
  });

  it('blocks saving when the active-ticket data produces a duplicate candidate', () => {
    const result = createEmptyTicketResult();
    result.ticket.coordinates = '50.4501, 30.5234';
    result.ticket.notes = 'Тестова заявка';
    result.duplicatesFound = [{
      ticketId: 'WSN-42',
      matchReason: 'ADDRESS_MATCH',
      ticketTitle: 'Аварія на Хрещатику',
      addressText: 'вул. Хрещатик, 15',
      coordinates: '50.4501, 30.5234'
    }];

    expect(getTicketValidationErrors({
      formData: toTicketFormData(result.ticket),
      result,
      verifications: getInitialVerifications(result),
      forceRegistrationUnlocked: false
    })).toContain('Знайдено можливі дублікати за адресою або координатами WSN. Створення призупинено до ручної перевірки.');
  });
});
