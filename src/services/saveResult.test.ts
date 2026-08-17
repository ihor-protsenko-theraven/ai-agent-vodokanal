import { describe, expect, it } from 'vitest';
import { isSaveSuccessful } from './saveResult';

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
});
