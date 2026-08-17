/**
 * Extracts Ukrainian applicant names from transcribed text.
 */

import { geoConfig, nlpConfig, speechConfig } from '@/shared/config';
import { capitalizeFirst } from '@/shared/utils/text';

export class ApplicantNameExtractor {
  extract(text: string): string {
    const lowerText = text.toLowerCase();

    // Full name after "мене звати" / "звати мене" (e.g. "Коваленко Іван Ігорович")
    const fullNameMatch = text.match(nlpConfig.NAME_FULL_PATTERN);
    if (fullNameMatch) {
      const candidate = fullNameMatch[1].trim();
      if (!this.isReservedCityOrStreetWord(candidate.split(/\s+/)[0])) {
        return candidate.split(/\s+/).map(capitalizeFirst).join(' ');
      }
    }

    for (const name of nlpConfig.COMMON_NAMES) {
      if (this.hasWord(lowerText, name)) {
        return capitalizeFirst(name);
      }
    }

    const explicitMatch = text.match(nlpConfig.NAME_EXPLICIT_PATTERN);
    if (explicitMatch) {
      const candidate = explicitMatch[1].trim();
      if (!this.isReservedCityOrStreetWord(candidate)) {
        return capitalizeFirst(candidate);
      }
    }

    return speechConfig.DEFAULT_APPLICANT_NAME;
  }

  private hasWord(text: string, word: string): boolean {
    return new RegExp(`(?<![а-яіїєґА-ЯІЇЄҐ])${word}(?![а-яіїєґА-ЯІЇЄҐ])`, 'i').test(text);
  }

  private isReservedCityOrStreetWord(word: string): boolean {
    const lower = word.toLowerCase();
    return Boolean(geoConfig.KNOWN_CITIES[lower]) || nlpConfig.RESERVED_STREET_WORDS.includes(lower);
  }
}
