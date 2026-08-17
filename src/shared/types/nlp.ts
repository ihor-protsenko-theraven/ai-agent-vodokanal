/**
 * NLP parsing types
 */

export interface ParsedAddress {
  fullAddress: string;
  city: string;
  hasStreet: boolean;
  hasHouseNumber: boolean;
}
