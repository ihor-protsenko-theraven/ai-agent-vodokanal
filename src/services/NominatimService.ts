/**
 * Nominatim (OpenStreetMap) Service
 * Thin client for forward/reverse geocoding and address search.
 */

import { geoConfig } from '../config';
import { AddressSearchResult } from '../types/geocoding';
import { GeodataAddress } from '../types/geodata';

class NominatimService {
  private headers(): HeadersInit {
    return { 'User-Agent': geoConfig.USER_AGENT };
  }

  private async getJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (e) {
      console.warn('[GeoCoding] Nominatim request failed:', e);
      return null;
    }
  }

  private formatCoords(lat: number, lon: number): string {
    const precision = geoConfig.COORDINATE_PRECISION;
    return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
  }

  private buildSearchUrl(addressStr: string, limit: number): string {
    const query = encodeURIComponent(`${addressStr}, ${geoConfig.DEFAULT_COUNTRY_SUFFIX}`);
    return `${geoConfig.NOMINATIM_BASE_URL}?q=${query}&format=json&limit=${limit}`;
  }

  /**
   * Forward geocode: address -> "lat, lng"
   */
  async geocode(addressStr: string): Promise<string | null> {
    const items = await this.getJson<Array<{ lat: string; lon: string }>>(
      this.buildSearchUrl(addressStr, geoConfig.NOMINATIM_GEOCODE_LIMIT)
    );
    if (items && items.length > 0) {
      return this.formatCoords(parseFloat(items[0].lat), parseFloat(items[0].lon));
    }
    return null;
  }

  /**
   * Address search suggestions (used by the manual address search UI)
   */
  async search(addressStr: string): Promise<AddressSearchResult | null> {
    const items = await this.getJson<Array<{ lat: string; lon: string; display_name?: string }>>(
      this.buildSearchUrl(addressStr, geoConfig.NOMINATIM_SEARCH_LIMIT)
    );
    if (!items || items.length === 0) return null;

    const first = items[0];
    const item: GeodataAddress = {
      AddressString: first.display_name || addressStr,
      Lat_: String(first.lat),
      Long_: String(first.lon)
    };

    return {
      item,
      coords: this.formatCoords(parseFloat(first.lat), parseFloat(first.lon))
    };
  }

  /**
   * Reverse geocode: "lat, lng" -> address string
   */
  async reverse(lat: number, lng: number): Promise<string | null> {
    const url =
      `${geoConfig.NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lng}` +
      `&format=json&accept-language=${geoConfig.NOMINATIM_ACCEPT_LANGUAGE}`;
    const data = await this.getJson<{ display_name?: string }>(url);
    return data?.display_name || null;
  }
}

export const nominatimService = new NominatimService();
