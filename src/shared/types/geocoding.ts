/**
 * Unified geocoding types
 */

import { GeodataAddress } from './geodata';

export type GeocodingProvider = 'auto' | 'geodata' | 'nominatim';

export type AddressSearchSource = 'geodata-full' | 'geodata-autocomplete' | 'nominatim';

/**
 * A FullAddress reply can contain a plausible, but different address. The
 * operator must decide whether a corrected address is really the location
 * described in the call before its coordinates are used in a WSN ticket.
 */
export interface AddressConfirmation {
  originalAddress: string;
  resolvedAddress: string;
  reasons: string[];
}

export interface AddressSearchResult {
  item: GeodataAddress;
  coords: string | null;
  source?: AddressSearchSource;
  confirmation?: AddressConfirmation;
}
