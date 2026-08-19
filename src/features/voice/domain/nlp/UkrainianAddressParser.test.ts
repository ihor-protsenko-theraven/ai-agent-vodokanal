import { describe, expect, it } from 'vitest';
import { UkrainianAddressParser } from './UkrainianAddressParser';

describe('UkrainianAddressParser', () => {
  const parser = new UkrainianAddressParser();

  it('extracts a multi-word explicit street and a house suffix', () => {
    expect(parser.parse('Прорив за адресою: м. Київ, вул. Саперно-Слобідська, 27-А')).toMatchObject({
      fullAddress: 'вул. Саперно-Слобідська, 27-А',
      hasStreet: true,
      hasHouseNumber: true
    });
  });

  it('accepts a street without a type only after an explicit address cue', () => {
    expect(parser.parse('Повідомили про аварію за адресою Хрещатик 20')).toMatchObject({
      fullAddress: 'Хрещатик 20',
      hasStreet: true,
      hasHouseNumber: true
    });
  });

  it('does not make a street from a generic building reference', () => {
    expect(parser.parse('Вода тече біля будинку 22, точну адресу не назвали')).toMatchObject({
      hasStreet: false,
      hasHouseNumber: false
    });
  });

  it('extracts an explicitly dictated residence separately from an incident address', () => {
    const text = 'Прорив на вул. Хрещатик, 20. Я проживаю за адресою вулиця Саперно-Слобідська 13/4';

    expect(parser.parse(text).fullAddress).toBe('вул. Хрещатик, 20');
    expect(parser.parseApplicantAddress(text)).toMatchObject({
      fullAddress: 'вулиця Саперно-Слобідська 13/4',
      hasStreet: true,
      hasHouseNumber: true
    });
  });

  it('does not correct or reformat a street extracted from speech', () => {
    expect(parser.parse('Прорив на вулиці Регана, 8А')).toMatchObject({
      fullAddress: 'вулиці Регана, 8А',
      hasStreet: true,
      hasHouseNumber: true
    });
  });
});
