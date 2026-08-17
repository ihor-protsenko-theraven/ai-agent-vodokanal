import { describe, expect, it } from 'vitest';
import { formatForlandAddress, formatForlandCoordinates, sortUnclosedTickets, toUnclosedTicketSummary } from '@/features/forland/domain/forlandTicketSummary';

describe('Forland active-ticket summary', () => {
  it('converts POINT(longitude latitude) WKT into the form coordinate format', () => {
    expect(formatForlandCoordinates({ wkt: 'POINT(30.5234 50.4501)' })).toBe('50.4501, 30.5234');
  });

  it('does not mislabel projected WKT values as latitude and longitude', () => {
    expect(formatForlandCoordinates({ wkt: 'POINT(6523021.451807455 3377767.93735557)' })).toBe('');
  });

  it('removes empty system placeholders from the address', () => {
    expect(formatForlandAddress('вулиця Леоніда Каденюка,20-А,undefined')).toBe('вулиця Леоніда Каденюка, 20-А');
  });

  it('keeps only fields required by the list and duplicate check', () => {
    expect(toUnclosedTicketSummary({
      ID: 42,
      Title: 'Аварія на мережі',
      MetaID: 27772,
      LogID: '639225979145900000',
      Init: {
        Properties: {
          f_389: 'м. Київ, вул. Хрещатик, 15',
          f_420: { wkt: 'POINT(30.5234 50.4501)' },
          f1981: '+380000000000'
        }
      }
    })).toEqual({
      id: 42,
      title: 'Аварія на мережі',
      createdAt: '2026-08-17T21:11:54.590Z',
      addressText: 'м. Київ, вул. Хрещатик, 15',
      coordinates: '50.4501, 30.5234',
      metaId: 27772,
      logId: '639225979145900000'
    });
  });

  it('sorts tickets by the creation timestamp and puts unknown dates last', () => {
    const tickets = [
      { id: 1, title: 'Без дати', addressText: '', coordinates: '' },
      { id: 2, title: 'Стара', createdAt: '2026-08-17T10:00:00.000Z', addressText: '', coordinates: '' },
      { id: 3, title: 'Нова', createdAt: '2026-08-18T10:00:00.000Z', addressText: '', coordinates: '' }
    ];

    expect(sortUnclosedTickets(tickets, 'newest').map((ticket) => ticket.id)).toEqual([3, 2, 1]);
    expect(sortUnclosedTickets(tickets, 'oldest').map((ticket) => ticket.id)).toEqual([2, 3, 1]);
  });
});
