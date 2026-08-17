import { describe, expect, it } from 'vitest';
import { getSavedUnit, getTicketNumber, isSaveSuccessful } from './saveResult';

describe('isSaveSuccessful', () => {
  it('accepts a successful transport response without an explicit API status', () => {
    expect(isSaveSuccessful({ transportStatus: 201, ID: 42 })).toBe(true);
  });

  it('accepts a 2xx transport and API response', () => {
    expect(isSaveSuccessful({ transportStatus: 200, HttpStatus: 200, success: true })).toBe(true);
  });

  it.each([
    null,
    { transportStatus: 401 },
    { transportStatus: 500 },
    { transportStatus: 200, HttpStatus: 400 },
    { transportStatus: 200, HttpStatus: 500 },
    { transportStatus: 200, success: false }
  ])('rejects an unsuccessful response: %o', (response) => {
    expect(isSaveSuccessful(response)).toBe(false);
  });

  it('rejects a 2xx response when Forland reports that no unit was saved', () => {
    expect(isSaveSuccessful({ transportStatus: 200, countSaved: 0 })).toBe(false);
  });

  it('extracts the created unit and its human-readable ticket number', () => {
    const response = {
      transportStatus: 200,
      countSaved: 1,
      units: [{ ID: 339308, Title: 'Заявка № 12263 [18.08.2026]', MetaID: 27772, LogID: '639225979145900000' }]
    };

    const unit = getSavedUnit(response);
    expect(unit).toMatchObject({ ID: 339308, MetaID: 27772 });
    expect(getTicketNumber(unit?.Title)).toBe('12263');
  });
});
