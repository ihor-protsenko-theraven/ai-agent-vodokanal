/**
 * Unified Geocoding Service
 * Supports switching between address search providers:
 * - 'geodata'   : Geodata.online (DM Solutions) API only
 * - 'nominatim' : Nominatim (OpenStreetMap) only
 * - 'auto'      : Geodata.online first, Nominatim as fallback (default)
 *
 * Used across voice processing, Gemini enrichment and the manual address search UI.
 */

import { geodataService } from '@/features/geocoding/infrastructure/GeodataService';
import { nominatimService } from '@/features/geocoding/infrastructure/NominatimService';
import { AddressSearchResult, GeocodingProvider } from '@/shared/types';

class GeocodingService {
  private provider: GeocodingProvider = 'auto';

  setProvider(provider: GeocodingProvider): void {
    this.provider = provider;
  }

  getProvider(): GeocodingProvider {
    return this.provider;
  }

  /**
   * Get coordinates ("lat, lng") for a text address using the selected provider.
   */
  async getCoordinates(addressStr: string): Promise<string | null> {
    if (!addressStr || !addressStr.trim()) return null;

    if (this.provider === 'nominatim') {
      return nominatimService.geocode(addressStr);
    }

    const geodataCoords = await geodataService.getCoordinates(addressStr);
    if (geodataCoords) return geodataCoords;

    if (this.provider === 'auto') {
      return nominatimService.geocode(addressStr);
    }

    return null;
  }

  /**
   * Get address string by coordinates using the selected provider.
   */
  async getAddressByCoordinates(lat: number, lng: number): Promise<string | null> {
    if (this.provider === 'nominatim') {
      return nominatimService.reverse(lat, lng);
    }

    const geodata = await geodataService.reverseGeocode(lat, lng);
    if (geodata?.AddressString) return geodata.AddressString;

    if (this.provider === 'auto') {
      return nominatimService.reverse(lat, lng);
    }

    return null;
  }

  /**
   * Search address suggestions using the selected provider.
   * Used by the manual address search UI.
   */
  async searchWithResults(addressStr: string, options: { resolveExact?: boolean } = {}): Promise<AddressSearchResult[]> {
    if (!addressStr || !addressStr.trim()) return [];

    if (this.provider === 'nominatim') {
      return nominatimService.search(addressStr);
    }

    // A deliberate click on "Search" means the operator supplied a complete
    // address, so resolve it through FullAddress first. This avoids treating
    // a 404 from the autocomplete endpoint as an address-resolution failure.
    if (options.resolveExact) {
      const resolved = await geodataService.resolveAddress(addressStr);
      if (resolved?.coordinates) {
        return [{
          item: {
            ...resolved.address,
            AddressString: resolved.address.AddressString || resolved.address.SourceAddress || addressStr
          },
          coords: resolved.coordinates
        }];
      }
    }

    const results: AddressSearchResult[] = [];
    const geodataResults = await geodataService.searchAddress(addressStr);

    for (const item of geodataResults) {
      results.push({
        item,
        coords: geodataService.getCoordinatesString(item)
      });
    }

    if (results.length === 0 && this.provider === 'auto') {
      results.push(...await nominatimService.search(addressStr));
    }

    return results;
  }
}

export const geocodingService = new GeocodingService();
export type { AddressSearchResult, GeocodingProvider };
