import { describe, expect, it } from 'vitest';
import { decodeGeminiTicketDraft } from './TicketDraftContract';
import { createTicketDraftCatalog } from './TicketDraftCatalog';

function validDraft() {
  return {
    ticket: {
      appealType: 'Витік води',
      ticketType: 'Аварійні роботи',
      applicantName: '',
      applicantAddress: '',
      addressText: 'м. Київ, вул. Хрещатик, 20',
      coordinates: '',
      phoneNumber: '+380501112233',
      incidentDateTime: '2026-08-18T10:15:00+03:00',
      notes: 'Надиктовано оператором: витік води.'
    },
    confidence: {
      speechRecognition: 0.8,
      classification: 0.9,
      addressExtraction: 0.8,
      geocoding: 0.5
    },
    requiresManualReview: false,
    requiresTicketRegistration: true,
    suggestedQuestions: [],
    duplicatesFound: []
  };
}

describe('decodeGeminiTicketDraft', () => {
  it('accepts only an operational WSN draft contract', () => {
    expect(decodeGeminiTicketDraft(validDraft())).toMatchObject({
      ticket: { appealType: 'Витік води', ticketType: 'Аварійні роботи' }
    });
  });

  it('rejects enum values and appeal/ticket-type combinations outside the WSN catalogue', () => {
    const badEnum = validDraft();
    badEnum.ticket.appealType = 'Прорив';

    const mismatchedType = validDraft();
    mismatchedType.ticket.ticketType = 'Планові роботи';

    expect(decodeGeminiTicketDraft(badEnum)).toBeNull();
    expect(decodeGeminiTicketDraft(mismatchedType)).toBeNull();
  });

  it('rejects a response without the required operator-dictation note prefix', () => {
    const draft = validDraft();
    draft.ticket.notes = 'Прорив за адресою вул. Хрещатик, 20';

    expect(decodeGeminiTicketDraft(draft)).toBeNull();
  });

  it('rejects unsafe primitive values and fake duplicate hints', () => {
    const invalid = validDraft();
    invalid.ticket.phoneNumber = '050 111 22 33';
    const invalidWithDuplicateHint = {
      ...invalid,
      duplicatesFound: [{ ticketId: 'fake' }]
    };

    expect(decodeGeminiTicketDraft(invalidWithDuplicateHint)).toBeNull();
  });

  it('keeps a valid draft but clears a malformed model phone number', () => {
    const draft = validDraft();
    draft.ticket.applicantAddress = 'вул. Саперно-Слобідська, 13/4';
    draft.ticket.phoneNumber = '+3809999993747';

    expect(decodeGeminiTicketDraft(draft)).toMatchObject({
      ticket: { applicantAddress: 'вул. Саперно-Слобідська, 13/4', phoneNumber: '' },
      requiresManualReview: true,
      suggestedQuestions: ['Уточніть номер телефону заявника.']
    });
  });

  it('accepts a new Forland category from the per-request live catalogue', () => {
    const draft = validDraft();
    draft.ticket.appealType = 'Спеціальний тип звернення';
    draft.ticket.ticketType = 'Спеціальний клас заявки';
    const catalog = createTicketDraftCatalog(
      ['Спеціальний тип звернення'],
      ['Спеціальний клас заявки']
    );

    expect(decodeGeminiTicketDraft(draft, catalog)).toMatchObject({
      ticket: {
        appealType: 'Спеціальний тип звернення',
        ticketType: 'Спеціальний клас заявки'
      },
      requiresManualReview: true,
      suggestedQuestions: ['Перевірте відповідність типу звернення та типу заявки в WSN.']
    });
  });
});
