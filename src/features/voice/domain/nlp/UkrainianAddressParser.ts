/**
 * Robust Ukrainian address parser.
 * Extracts city, street and house number from unstructured speech transcripts.
 */

import { geoConfig, speechConfig } from '@/shared/config';
import { ParsedAddress } from '@/shared/types/nlp';

const UKRAINIAN_WORD = `[а-яіїєґ][а-яіїєґ'’-]*`;
const STREET_TYPE = '(?:вул(?:[.]|иц(?:я|і|ю|е))?|просп(?:[.]|ект)?|пров(?:[.]|улок)?|бульв(?:ар|[.])?|бул[.]|майдан|наб(?:ережна|[.])?|площ(?:а|[.])?)';
const HOUSE_NUMBER = '\\d+(?:[-а-яіїєґa-z]+)?(?:\\/\\d+)?';
const STREET_NAME = `${UKRAINIAN_WORD}(?:\\s+${UKRAINIAN_WORD}){0,3}`;

// An address without a street type is accepted only after a clear address
// cue. This avoids interpreting natural language such as "біля будинку 22"
// or "тиск води 20" as a street and house number.
const EXPLICIT_STREET_PATTERN = new RegExp(
  `${STREET_TYPE}\\s+(${STREET_NAME})\\s*(?:,|\\s)+(?:буд(?:инок)?\\.?\\s*|№\\s*)?(${HOUSE_NUMBER})(?=$|[^\\p{L}\\p{N}])`,
  'iu'
);
const CUE_ADDRESS_PATTERN = new RegExp(
  `(?:за\\s+адрес(?:ою|ою)|адрес[аи]|на\\s+вулиці)\\s+(?:${STREET_TYPE}\\s+)?(${STREET_NAME})\\s*(?:,|\\s)+(?:буд(?:инок)?\\.?\\s*|№\\s*)?(${HOUSE_NUMBER})(?=$|[^\\p{L}\\p{N}])`,
  'iu'
);
const STREET_ONLY_PATTERN = new RegExp(`${STREET_TYPE}\\s+(${STREET_NAME})(?=$|[,.;])`, 'iu');
const RESIDENCE_ADDRESS_PATTERN = /(?:\bя\s+)?(?:проживаю|мешкаю)\s+(?:за\s+)?адрес(?:ою|і)\s*[:,-]?\s*(.+)$/iu;
const MY_ADDRESS_PATTERN = /(?:моя\s+адреса|адреса\s+проживання)\s*[:,-]?\s*(.+)$/iu;

export class UkrainianAddressParser {
  parse(text: string): ParsedAddress {
    const city = this.detectCity(text);

    const explicitMatch = text.match(EXPLICIT_STREET_PATTERN);
    if (explicitMatch) {
      return {
        // Keep the spoken fragment as-is. FullAddress, rather than browser
        // NLP, is responsible for interpreting Ukrainian cases and typos.
        fullAddress: explicitMatch[0].trim(),
        city,
        hasStreet: true,
        hasHouseNumber: true
      };
    }

    const cueMatch = text.match(CUE_ADDRESS_PATTERN);
    if (cueMatch) {
      return {
        fullAddress: this.removeAddressCue(cueMatch[0]),
        city,
        hasStreet: true,
        hasHouseNumber: true
      };
    }

    const streetOnlyMatch = text.match(STREET_ONLY_PATTERN);
    if (streetOnlyMatch) {
      return {
        fullAddress: streetOnlyMatch[0].trim(),
        city,
        hasStreet: true,
        hasHouseNumber: false
      };
    }

    return {
      fullAddress: `м. ${city} (${speechConfig.FALLBACK_ADDRESS_SUFFIX})`,
      city,
      hasStreet: false,
      hasHouseNumber: false
    };
  }

  /**
   * Extracts a residence address only after an explicit residence cue. This
   * keeps it separate from the earlier incident address in the same call.
   */
  parseApplicantAddress(text: string): ParsedAddress | null {
    const residenceMatch = text.match(RESIDENCE_ADDRESS_PATTERN) ?? text.match(MY_ADDRESS_PATTERN);
    if (!residenceMatch) return null;

    const parsed = this.parse(residenceMatch[0]);
    return parsed.hasStreet ? parsed : null;
  }

  private detectCity(text: string): string {
    let city: string = geoConfig.DEFAULT_CITY_NAME;
    const words = text.split(/\s+/);

    for (const w of words) {
      const cleanW = w.toLowerCase().replace(/[^а-яіїєґ]/g, '');
      if (geoConfig.KNOWN_CITIES[cleanW]) {
        city = geoConfig.KNOWN_CITIES[cleanW];
        break;
      }
    }

    return city;
  }

  private removeAddressCue(value: string): string {
    return value
      .replace(/^(?:за\s+адрес(?:ою|ою)|адрес[аи])\s*[:,-]?\s*/iu, '')
      .trim();
  }
}
