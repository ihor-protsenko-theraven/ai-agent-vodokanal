import { describe, expect, it } from 'vitest';
import { isLikelyAddressMatch } from './addressMatch';

describe('isLikelyAddressMatch', () => {
  it('matches normalized Ukrainian street prefixes and a house number', () => {
    expect(isLikelyAddressMatch('вул. Хрещатик, 15', 'Аварія: вулиця Хрещатик 15')).toBe(true);
  });

  it('rejects the same street with another house number', () => {
    expect(isLikelyAddressMatch('вул. Хрещатик, 15', 'Аварія: вул. Хрещатик 18')).toBe(false);
  });

  it('rejects generic incident text that does not contain the address', () => {
    expect(isLikelyAddressMatch('просп. Берестейський, 88', 'Заявка № 1045: витік води')).toBe(false);
  });

  it('requires two meaningful words when the report has no house number', () => {
    expect(isLikelyAddressMatch('проспект Героїв Небесної Сотні', 'просп. Героїв Небесної Сотні')).toBe(true);
    expect(isLikelyAddressMatch('Хрещатик', 'Аварія на Хрещатику')).toBe(false);
  });
});
