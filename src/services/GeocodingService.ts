/**
 * Unified Geocoding Service
 * Supports switching between address search providers:
 * - 'geodata'   : Geodata.online (DM Solutions) API only
 * - 'nominatim' : Nominatim (OpenStreetMap) only
 * - 'auto'      : Geodata.online first, Nominatim as fallback (default)
 *
 * Used across voice processing, Gemini enrichment and the manual address search UI.
 */

import { geoConfig } from '../config';
import { geodataService, GeodataAddress } from './GeodataService';

export type GeocodingProvider = 'auto' | 'geodata' | 'nominatim';

export interface AddressSearchResult {
  item: GeodataAddress;
  coords: string | null;
}

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
      return this.nominatimCoordinates(addressStr);
    }

    const geodataCoords = await geodataService.getCoordinates(addressStr);
    if (geodataCoords) return geodataCoords;

    if (this.provider === 'auto') {
      return this.nominatimCoordinates(addressStr);
    }

    return null;
  }

  /**
   * Get address string by coordinates using the selected provider.
   */
  async getAddressByCoordinates(lat: number, lng: number): Promise<string | null> {
    if (this.provider === 'nominatim') {
      return this.nominatimReverse(lat, lng);
    }

    const geodata = await geodataService.reverseGeocode(lat, lng);
    if (geodata?.AddressString) return geodata.AddressString;

    if (this.provider === 'auto') {
      return this.nominatimReverse(lat, lng);
    }

    return null;
  }

  /**
   * Search address suggestions using the selected provider.
   * Used by the manual address search UI.
   */
  async searchWithResults(addressStr: string): Promise<AddressSearchResult[]> {
    if (!addressStr || !addressStr.trim()) return [];

    if (this.provider === 'nominatim') {
      const nominatim = await this.nominatimFirst(addressStr);
      return nominatim ? [nominatim] : [];
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
      const nominatim = await this.nominatimFirst(addressStr);
      if (nominatim) {
        results.push(nominatim);
      }
    }

    return results;
  }

  private async nominatimCoordinates(addressStr: string): Promise<string | null> {
    try {
      const query = encodeURIComponent(`${addressStr}, ${geoConfig.DEFAULT_COUNTRY_SUFFIX}`);
      const url = `${geoConfig.NOMINATIM_BASE_URL}?q=${query}&format=json&limit=1`;

      const res = await fetch(url, {
        headers: { 'User-Agent': geoConfig.USER_AGENT }
      });

      if (!res.ok) return null;

      const items = await res.json();
      if (items?.length > 0) {
        return `${parseFloat(items[0].lat).toFixed(4)}, ${parseFloat(items[0].lon).toFixed(4)}`;
      }
    } catch (e) {
      console.warn('[GeoCoding] Nominatim geocode failed:', e);
    }
    return null;
  }

  private async nominatimFirst(addressStr: string): Promise<AddressSearchResult | null> {
    try {
      const query = encodeURIComponent(`${addressStr}, ${geoConfig.DEFAULT_COUNTRY_SUFFIX}`);
      const url = `${geoConfig.NOMINATIM_BASE_URL}?q=${query}&format=json&limit=3`;

      const res = await fetch(url, {
        headers: { 'User-Agent': geoConfig.USER_AGENT }
      });

      if (!res.ok) return null;

      const items = await res.json();
      if (items?.length > 0) {
        const first = items[0];
        return {
          item: {
            AddressString: first.display_name || addressStr,
            Lat_: String(first.lat),
            Long_: String(first.lon)
          },
          coords: `${parseFloat(first.lat).toFixed(4)}, ${parseFloat(first.lon).toFixed(4)}`
        };
      }
    } catch (e) {
      console.warn('[GeoCoding] Nominatim search failed:', e);
    }
    return null;
  }

  private async nominatimReverse(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uk`;

      const res = await fetch(url, {
        headers: { 'User-Agent': geoConfig.USER_AGENT }
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data?.display_name || null;
    } catch (e) {
      console.warn('[GeoCoding] Nominatim reverse failed:', e);
      return null;
    }
  }
}

export const geocodingService = new GeocodingService();
