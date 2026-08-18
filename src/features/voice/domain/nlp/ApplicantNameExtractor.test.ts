import { describe, expect, it } from 'vitest';
import { ApplicantNameExtractor } from './ApplicantNameExtractor';
import { speechConfig } from '@/shared/config';

describe('ApplicantNameExtractor', () => {
  const extractor = new ApplicantNameExtractor();

  it('extracts a name after explicit self-identification', () => {
    expect(extractor.extract('Мене звати Олена, повідомляю про витік')).toBe('Олена');
  });

  it('does not treat a name in a landmark as the applicant', () => {
    expect(extractor.extract('Витік біля магазину Марія на Хрещатику')).toBe(
      speechConfig.DEFAULT_APPLICANT_NAME
    );
  });

  it('does not treat "я проживаю" as an applicant name', () => {
    expect(extractor.extract('Я проживаю біля вул. Хрещатик, 20')).toBe(
      speechConfig.DEFAULT_APPLICANT_NAME
    );
  });
});
