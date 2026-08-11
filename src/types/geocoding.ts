/**
 * Unified geocoding types
 */

import { GeodataAddress } from './geodata';

export type GeocodingProvider = 'auto' | 'geodata' | 'nominatim';

export interface AddressSearchResult {
  item: GeodataAddress;
  coords: string | null;
}
