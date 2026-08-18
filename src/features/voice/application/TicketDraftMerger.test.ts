import { describe, expect, it } from 'vitest';
import { TicketDraftMerger } from './TicketDraftMerger';
import { createTicketDraftCatalog } from '@/features/voice/domain/TicketDraftCatalog';

describe('TicketDraftMerger', () => {
  const merger = new TicketDraftMerger();

  it('keeps a valid model address instead of overwriting it with browser text', () => {
    const draft = merger.merge({
      modelTicket: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи',
        addressText: 'м. Київ, вул. Хрещатик, 20',
        applicantAddress: 'м. Київ, вул. Правильна, 7',
        applicantName: 'Олена',
        phoneNumber: '+380501112233'
      },
      localCandidate: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи',
        addressText: 'м. Київ, вул. Помилкова, 20',
        applicantName: 'Ірина',
        applicantAddress: 'м. Київ, вул. Інша, 12',
        phoneNumber: '+380671234567'
      }
    });

    expect(draft.addressText).toBe('м. Київ, вул. Хрещатик, 20');
    expect(draft.applicantName).toBe('Олена');
    expect(draft.phoneNumber).toBe('+380501112233');
    expect(draft.applicantAddress).toBe('м. Київ, вул. Правильна, 7');
    expect(draft.coordinates).toBe('');
  });

  it('uses the explicit low-pressure signal over a generic model leak', () => {
    const draft = merger.merge({
      modelTicket: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи'
      },
      localCandidate: {
        appealType: 'Низький тиск води',
        ticketType: 'Аварійні роботи',
        addressText: null,
        applicantName: null,
        applicantAddress: null,
        phoneNumber: null
      }
    });

    expect(draft.appealType).toBe('Низький тиск води');
    expect(draft.ticketType).toBe('Аварійні роботи');
  });

  it('keeps Gemini sewer-leak classification when browser text contains a generic pipe burst', () => {
    const draft = merger.merge({
      modelTicket: {
        appealType: 'Витік каналізації',
        ticketType: 'Аварійні роботи'
      },
      localCandidate: {
        appealType: 'Витік води',
        ticketType: 'Аварійні роботи',
        addressText: 'м. Київ, вул. Велика Китаївська, 81',
        applicantName: 'Ігор Проценко',
        applicantAddress: null,
        phoneNumber: null
      }
    });

    expect(draft.appealType).toBe('Витік каналізації');
    expect(draft.ticketType).toBe('Аварійні роботи');
  });

  it('uses local fields only when a model field is missing or invalid', () => {
    const draft = merger.merge({
      modelTicket: {
        appealType: 'Невідомий тип',
        ticketType: 'Невідомий клас',
        applicantName: '',
        phoneNumber: '',
        addressText: ''
      },
      localCandidate: {
        appealType: 'Закупорка',
        ticketType: 'Аварійні роботи',
        addressText: 'м. Київ, вул. Миру, 11',
        applicantName: 'Марія',
        applicantAddress: null,
        phoneNumber: '+380931112233'
      }
    });

    expect(draft).toMatchObject({
      appealType: 'Закупорка',
      ticketType: 'Аварійні роботи',
      applicantName: 'Марія',
      phoneNumber: '+380931112233',
      addressText: 'м. Київ, вул. Миру, 11'
    });
  });

  it('uses an explicit residence, or otherwise falls back to the incident address', () => {
    const withResidence = merger.merge({
      modelTicket: { addressText: 'м. Київ, вул. Хрещатик, 20', applicantAddress: '' },
      localCandidate: {
        appealType: null,
        ticketType: null,
        addressText: 'м. Київ, вул. Хрещатик, 20',
        applicantName: null,
        applicantAddress: 'м. Київ, вул. Саперно-Слобідська, 13/4',
        phoneNumber: null
      }
    });
    const withoutResidence = merger.merge({
      modelTicket: { addressText: 'м. Київ, вул. Хрещатик, 20', applicantAddress: '' },
      localCandidate: null
    });

    expect(withResidence.applicantAddress).toBe('м. Київ, вул. Саперно-Слобідська, 13/4');
    expect(withoutResidence.applicantAddress).toBe('м. Київ, вул. Хрещатик, 20');
  });

  it('preserves a category introduced by the live Forland catalogue', () => {
    const draft = merger.merge({
      modelTicket: {
        appealType: 'Спеціальний тип звернення',
        ticketType: 'Спеціальний клас заявки'
      },
      localCandidate: null,
      catalog: createTicketDraftCatalog(
        ['Спеціальний тип звернення'],
        ['Спеціальний клас заявки']
      )
    });

    expect(draft).toMatchObject({
      appealType: 'Спеціальний тип звернення',
      ticketType: 'Спеціальний клас заявки'
    });
  });
});
