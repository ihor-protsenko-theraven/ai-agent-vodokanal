import { describe, expect, it } from 'vitest';
import { formatForlandAddress, formatForlandCoordinates, toUnclosedTicketSummary } from './forlandTicketSummary';

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
      LogID: 'log-42',
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
      addressText: 'м. Київ, вул. Хрещатик, 15',
      coordinates: '50.4501, 30.5234',
      metaId: 27772,
      logId: 'log-42'
    });
  });
});
