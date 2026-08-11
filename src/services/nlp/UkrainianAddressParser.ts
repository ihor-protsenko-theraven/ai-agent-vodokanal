/**
 * Robust Ukrainian address parser.
 * Extracts city, street and house number from unstructured speech transcripts.
 */

import { geoConfig, nlpConfig, speechConfig } from '../../config';
import { ParsedAddress } from '../../types/nlp';
import { capitalizeFirst } from '../../utils/text';

const EXPLICIT_STREET_PATTERN =
  /(?:вул\.|вулиц(?:я|і|ю|е)|просп\.|проспект|провулок|бульвар|бул\.)\s*([а-яіїєґА-ЯІЇЄҐ\-]+(?:\s+[а-яіїєґА-ЯІЇЄҐ\-]+)?)\s*(?:буд\.|будинок|№)?\s*(\d+[а-яА-Я\-]*)/i;

const IMPLICIT_STREET_PATTERN =
  /(?:з|на|по)?\s*([а-яіїєґ]{2,}(?:\s+[а-яіїєґ]{2,})?)\s+(\d+[а-яА-Я\-]*)/i;

const STREET_ONLY_PATTERN =
  /(?:вул\.|вулиц(?:я|і|ю|е)|просп\.|проспект|провулок)\s+([а-яіїєґ]{2,})/i;

export class UkrainianAddressParser {
  parse(text: string): ParsedAddress {
    const city = this.detectCity(text);

    const explicitMatch = text.match(EXPLICIT_STREET_PATTERN);
    if (explicitMatch) {
      const street = this.normalizeStreetName(explicitMatch[1].trim());
      const house = explicitMatch[2].trim();
      return {
        fullAddress: `м. ${city}, вул. ${street}, ${house}`,
        city,
        hasStreet: true,
        hasHouseNumber: true
      };
    }

    const implicitMatch = text.match(IMPLICIT_STREET_PATTERN);
    if (implicitMatch) {
      const rawStreetCandidate = implicitMatch[1].trim();
      const houseNumber = implicitMatch[2].trim();
      const streetCandidate = this.normalizeStreetName(rawStreetCandidate);

      if (streetCandidate.toLowerCase() === city.toLowerCase() || geoConfig.KNOWN_CITIES[streetCandidate.toLowerCase()]) {
        const afterCityMatch = text.match(new RegExp(`${city}\\s+([а-яіїєґ]{2,}(?:\\s+[а-яіїєґ]+)?)\\s+(\\d+[а-яА-Я\\-]*)`, 'i'));
        if (afterCityMatch && !this.isStreetTypeWord(afterCityMatch[1])) {
          return {
            fullAddress: `м. ${city}, вул. ${this.normalizeStreetName(afterCityMatch[1])}, ${afterCityMatch[2]}`,
            city,
            hasStreet: true,
            hasHouseNumber: true
          };
        }
      } else if (!this.isStreetTypeWord(rawStreetCandidate) && !this.isReservedKeyword(streetCandidate)) {
        return {
          fullAddress: `м. ${city}, вул. ${streetCandidate}, ${houseNumber}`,
          city,
          hasStreet: true,
          hasHouseNumber: true
        };
      }
    }

    const streetOnlyMatch = text.match(STREET_ONLY_PATTERN);
    if (streetOnlyMatch) {
      return {
        fullAddress: `м. ${city}, вул. ${this.normalizeStreetName(streetOnlyMatch[1])}`,
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

  private normalizeStreetName(streetStr: string): string {
    const clean = streetStr.trim().toLowerCase();

    for (const [alias, name] of Object.entries(nlpConfig.STREET_ALIASES)) {
      if (clean.includes(alias)) return name;
    }

    return capitalizeFirst(clean);
  }

  private isReservedKeyword(word: string): boolean {
    return nlpConfig.RESERVED_KEYWORDS.includes(word.toLowerCase());
  }

  private isStreetTypeWord(candidate: string): boolean {
    const firstToken = candidate.split(/\s+/)[0].toLowerCase();
    return geoConfig.STREET_TYPE_KEYWORDS.some((keyword) => firstToken.startsWith(keyword));
  }
}
