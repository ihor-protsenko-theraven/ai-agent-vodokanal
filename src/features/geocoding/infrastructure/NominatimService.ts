/**
 * Nominatim (OpenStreetMap) Service
 * Thin client for forward/reverse geocoding and address search.
 */

import { geoConfig } from '@/shared/config';
import { AddressSearchResult } from '@/shared/types';

interface NominatimSearchItem {
  lat: string;
  lon: string;
  display_name?: string;
  category?: string;
  addresstype?: string;
  address?: { house_number?: string };
}

class NominatimService {
  private readonly isDevelopment = import.meta.env.DEV && import.meta.env.MODE !== 'test';

  private headers(): HeadersInit {
    // Browsers forbid scripts from setting User-Agent. Sending only a
    // CORS-safelisted Accept header avoids a misleading, silently discarded
    // header and keeps the request compatible with the public endpoint.
    return { Accept: 'application/json' };
  }

  private async getJson<T>(url: string): Promise<T | null> {
    this.debug('request', { url: this.readableUrl(url) });

    try {
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        console.warn('[Nominatim] Request failed', { status: res.status, url: this.readableUrl(url) });
        return null;
      }

      const data = (await res.json()) as T;
      this.debug('response', {
        status: res.status,
        records: Array.isArray(data) ? data.length : 1,
        url: this.readableUrl(url)
      });
      return data;
    } catch (e) {
      console.warn('[Nominatim] Network request failed', { url: this.readableUrl(url), error: e });
      return null;
    }
  }

  private debug(event: string, details: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.info(`[Nominatim] ${event}`, details);
    }
  }

  private readableUrl(url: string): string {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  }

  private formatCoordinate(value: string): string | null {
    const raw = value.trim();
    const match = raw.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
    if (!match) return null;

    const [, sign, integer, fraction = ''] = match;
    const precision = geoConfig.COORDINATE_PRECISION;
    const digits = fraction.padEnd(precision + 1, '0');
    let rounded = BigInt(`${integer}${digits.slice(0, precision)}`);
    if (Number(digits[precision]) >= 5) rounded += 1n;

    const valueDigits = rounded.toString().padStart(precision + 1, '0');
    const whole = valueDigits.slice(0, -precision);
    const decimal = valueDigits.slice(-precision);
    return `${sign}${whole}.${decimal}`;
  }

  private formatCoords(lat: string, lon: string): string | null {
    const formattedLat = this.formatCoordinate(lat);
    const formattedLon = this.formatCoordinate(lon);
    return formattedLat && formattedLon ? `${formattedLat}, ${formattedLon}` : null;
  }

  private toSearchResult(item: NominatimSearchItem, fallbackAddress: string): AddressSearchResult | null {
    const coords = this.formatCoords(item.lat, item.lon);
    if (!coords) return null;

    return {
      item: {
        AddressString: item.display_name || fallbackAddress,
        Lat_: item.lat,
        Long_: item.lon
      },
      coords
    };
  }

  private chooseCoordinateItem(items: NominatimSearchItem[]): NominatimSearchItem | undefined {
    // A building with a house number is more reliable for an аварійна заявка
    // than a nearby POI that happens to share the same address.
    return items.find((item) => item.category === 'building' && item.address?.house_number)
      ?? items.find((item) => item.address?.house_number)
      ?? items[0];
  }

  private buildSearchUrl(addressStr: string, limit: number): string {
    const normalizedAddress = addressStr.replace(/\s+/g, ' ').trim();
    // Do not use \b here: JavaScript treats Cyrillic letters as non-word
    // characters, which made "Україна" get appended twice.
    const query = /україна/iu.test(normalizedAddress)
      ? normalizedAddress
      : `${normalizedAddress}, ${geoConfig.DEFAULT_COUNTRY_SUFFIX}`;
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'ua',
      'accept-language': geoConfig.NOMINATIM_ACCEPT_LANGUAGE,
      limit: String(limit)
    });
    return `${geoConfig.NOMINATIM_BASE_URL}?${params.toString()}`;
  }

  /**
   * Forward geocode: address -> "lat, lng"
   */
  async geocode(addressStr: string): Promise<string | null> {
    const items = await this.getJson<NominatimSearchItem[]>(
      this.buildSearchUrl(addressStr, geoConfig.NOMINATIM_GEOCODE_LIMIT)
    );
    const item = items && items.length > 0 ? this.chooseCoordinateItem(items) : undefined;
    return item ? this.formatCoords(item.lat, item.lon) : null;
  }

  /**
   * Address search suggestions (used by the manual address search UI)
   */
  async search(addressStr: string): Promise<AddressSearchResult[]> {
    const items = await this.getJson<NominatimSearchItem[]>(
      this.buildSearchUrl(addressStr, geoConfig.NOMINATIM_SEARCH_LIMIT)
    );
    if (!items || items.length === 0) return [];

    return items
      .map((item) => this.toSearchResult(item, addressStr))
      .filter((item): item is AddressSearchResult => item !== null);
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
