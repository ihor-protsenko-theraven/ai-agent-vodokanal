/**
 * Robust phone number extractor.
 * Handles "099 321-22-33", "099 321 22 33", "099-321-2233", "+380..." etc.
 */

import { nlpConfig } from '@/shared/config';

export class PhoneExtractor {
  extract(text: string): string {
    const [directPattern, keywordPattern] = nlpConfig.PHONE_PATTERNS;

    const directMatch = text.match(directPattern);
    if (directMatch) {
      const rawDigits = directMatch[0].replace(/[^\d]/g, '');
      const normalized = this.normalize(rawDigits);
      if (normalized) return normalized;
    }

    const keywordMatch = text.match(keywordPattern);
    if (keywordMatch) {
      const rawDigits = keywordMatch[1].replace(/[^\d]/g, '');
      const normalized = this.normalize(rawDigits);
      if (normalized) return normalized;
    }

    return '';
  }

  private normalize(rawDigits: string): string | null {
    const { PHONE_COUNTRY_PREFIX, PHONE_DIGITS_LOCAL_LENGTH, PHONE_DIGITS_FULL_LENGTH } = nlpConfig;

    if (rawDigits.length === PHONE_DIGITS_LOCAL_LENGTH && rawDigits.startsWith('0')) {
      return `${PHONE_COUNTRY_PREFIX}${rawDigits}`;
    }
    if (rawDigits.length === PHONE_DIGITS_FULL_LENGTH && rawDigits.startsWith('380')) {
      return `+${rawDigits}`;
    }
    if (rawDigits.length >= PHONE_DIGITS_LOCAL_LENGTH) {
      return `${PHONE_COUNTRY_PREFIX}${rawDigits.slice(-PHONE_DIGITS_LOCAL_LENGTH)}`;
    }

    return null;
  }
}
