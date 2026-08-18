import { describe, expect, it } from 'vitest';
import { createTicketDraftCatalog } from './TicketDraftCatalog';

describe('createTicketDraftCatalog', () => {
  it('uses the exact live Forland labels and removes accidental duplicates', () => {
    expect(createTicketDraftCatalog(
      ['Витік каналізації', 'Витік каналізації', 'Спеціальний тип'],
      ['Аварійні роботи', 'Спеціальний клас']
    )).toEqual({
      appealTypes: ['Витік каналізації', 'Спеціальний тип'],
      ticketTypes: ['Аварійні роботи', 'Спеціальний клас']
    });
  });
});
