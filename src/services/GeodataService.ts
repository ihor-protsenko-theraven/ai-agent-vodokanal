/**
 * Geodata.online (DM Solutions) Service
 * Provides address search, full address processing and reverse geocoding.
 *
 * API docs (Postman collection "Geodata.online"):
 * - GET /api/Address            - address search by partial input (free)
 * - GET /api/FullAddress        - full address processing with coordinates (paid)
 * - GET /api/ReverseGeocoding   - address lookup by coordinates
 *
 * All requests require `Authorization: Bearer <token>`.
 */

import { geoConfig } from '../config';
import { GeodataAddress, GeodataCity, GeodataHouse, GeodataStreet } from '../types';

export interface GeodataAddressResolution {
  address: GeodataAddress;
  coordinates: string | null;
}

class GeodataService {
  private baseUrl: string = geoConfig.GEODATA_BASE_URL;
  private token: string = geoConfig.GEODATA_TOKEN;
  private defaultLang: string = geoConfig.GEODATA_LANG;
  private readonly isDevelopment = import.meta.env.DEV;

  private getHeaders(): HeadersInit {
    return { 'Authorization': `Bearer ${this.token}` };
  }

  private async get<T>(path: string, options: { notFoundIsExpected?: boolean } = {}): Promise<T | null> {
    this.debug('request', { path: this.readablePath(path) });

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        const log = res.status === 404 && options.notFoundIsExpected ? console.info : console.warn;
        log(`[Geodata] ${res.status === 404 ? 'No matching result' : 'Request failed'}`, {
          path: this.readablePath(path),
          status: res.status
        });
        return null;
      }

      const data = (await res.json()) as T;
      this.debug('response', {
        path: this.readablePath(path),
        status: res.status,
        records: Array.isArray(data) ? data.length : 1
      });
      return data;
    } catch (e) {
      console.warn('[Geodata] Network request failed:', { path: this.readablePath(path), error: e });
      return null;
    }
  }

  private debug(event: string, details: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.info(`[Geodata] ${event}`, details);
    }
  }

  private readablePath(path: string): string {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }

  private buildQuery(params: Record<string, string | number>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value));
    }
    return searchParams.toString();
  }

  /**
   * Address API - search address by partial input (free)
   *
   * The API is format-sensitive: a street-type keyword ("вул", "просп", ...)
   * must precede the street name, otherwise it returns 404. We build several
   * normalized query candidates and use the first one that returns results.
   */
  async searchAddress(request: string, lang?: string): Promise<GeodataAddress[]> {
    if (!request || !request.trim()) return [];

    const candidates = this.buildQueryCandidates(request);
    const seen = new Set<string>();
    const results: GeodataAddress[] = [];

    for (const candidate of candidates) {
      const query = this.buildQuery({
        sRequest: candidate,
        sLang: lang || this.defaultLang
      });
      const data = await this.get<GeodataAddress[]>(`${geoConfig.GEODATA_ADDRESS_PATH}?${query}`, {
        notFoundIsExpected: true
      });

      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          const key = `${item.HouseId ?? ''}|${item.StreetId ?? ''}|${item.AddressString ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        }
        if (results.length > 0) break;
      }
    }

    return results;
  }

  /**
   * FullAddress API - full address processing with coordinates (paid)
   */
  async getFullAddress(request: string, lang?: string): Promise<GeodataAddress | null> {
    if (!request || !request.trim()) return null;
    const query = this.buildQuery({
      sRequest: this.normalizeRequest(request),
      sLang: lang || this.defaultLang
    });
    const data = await this.get<GeodataAddress[]>(`${geoConfig.GEODATA_FULL_ADDRESS_PATH}?${query}`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  /**
   * The three endpoints below are the deterministic fallback described in the
   * Geodata.online Postman collection. Their monikers are intentionally passed
   * from one request to the next: a street name alone is not globally unique.
   */
  async searchCities(request: string, region?: string, lang?: string): Promise<GeodataCity[]> {
    if (!request.trim()) return [];
    const query = this.buildQuery({
      sRequest: request.trim(),
      ...(region?.trim() ? { sRegion: region.trim() } : {}),
      sLang: lang || this.defaultLang
    });
    const data = await this.get<GeodataCity[]>(`${geoConfig.GEODATA_CITIES_PATH}?${query}`);
    return Array.isArray(data) ? data : [];
  }

  async searchStreets(request: string, cityMoniker: string, lang?: string): Promise<GeodataStreet[]> {
    if (!request.trim() || !cityMoniker.trim()) return [];
    const query = this.buildQuery({
      sRequest: request.trim(),
      stMoniker: cityMoniker.trim(),
      sLang: lang || this.defaultLang
    });
    const data = await this.get<GeodataStreet[]>(`${geoConfig.GEODATA_STREETS_PATH}?${query}`);
    return Array.isArray(data) ? data : [];
  }

  async searchHouses(request: string, streetMoniker: string, lang?: string): Promise<GeodataHouse[]> {
    if (!request.trim() || !streetMoniker.trim()) return [];
    const query = this.buildQuery({
      sRequest: request.trim(),
      houseMoniker: streetMoniker.trim(),
      sLang: lang || this.defaultLang
    });
    const data = await this.get<GeodataHouse[]>(`${geoConfig.GEODATA_HOUSES_PATH}?${query}`);
    return Array.isArray(data) ? data : [];
  }

  /**
   * ReverseGeocoding API - address by coordinates
   */
  async reverseGeocode(lat: number, lng: number, lang?: string): Promise<GeodataAddress | null> {
    const query = this.buildQuery({
      lat: lat,
      lng: lng,
      sLang: lang || this.defaultLang
    });
    const data = await this.get<GeodataAddress[]>(`${geoConfig.GEODATA_REVERSE_GEOCODING_PATH}?${query}`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  /**
   * Build query candidates for the format-sensitive Address API.
   * 1. Normalized request (long street-type words shortened, punctuation cleaned).
   * 2. Normalized + street-type keyword inserted (when missing).
   */
  private buildQueryCandidates(request: string): string[] {
    const candidates: string[] = [];
    const normalized = this.normalizeRequest(request);

    candidates.push(normalized);

    const withKeyword = this.ensureStreetKeyword(normalized);
    if (withKeyword !== normalized && !candidates.includes(withKeyword)) {
      candidates.push(withKeyword);
    }

    return candidates;
  }

  /**
   * Normalize address for the Geodata API: shorten street-type words,
   * drop punctuation/commas, remove country suffix.
   */
  private normalizeRequest(request: string): string {
    let q = request.trim();

    for (const [word, short] of Object.entries(geoConfig.STREET_TYPE_ALIASES)) {
      q = this.replaceWholeWord(q, word, short);
    }

    q = q.replace(geoConfig.COUNTRY_SUFFIX_PATTERN, '');

    // Collapse "м.", "вул." etc. dots to spaces and squeeze whitespace
    q = q
      .replace(/\./g, ' ')
      .replace(/[,;\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // "м." / "м" is a human-facing city prefix, but is not accepted by
    // the Address endpoint. Keep only the actual city name.
    q = q.replace(/^(?:м|місто)\s+/iu, '');

    return q;
  }

  private replaceWholeWord(value: string, word: string, replacement: string): string {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // \b is ASCII-oriented in JavaScript and fails around Cyrillic words such
    // as "вул". Unicode letter/number boundaries make this reliable.
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'giu');
    return value.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`);
  }

  /**
   * If the address has no street-type keyword, insert "вул" between the
   * city (first token) and the street name, e.g.
   * "Житомир Київська 24" -> "Житомир вул Київська 24".
   */
  private ensureStreetKeyword(q: string): string {
    const keywords = geoConfig.STREET_TYPE_KEYWORDS.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const streetTypePattern = new RegExp(
      `(^|[^\\p{L}\\p{N}_])(?:${keywords.join('|')})(?=$|[^\\p{L}\\p{N}_])`,
      'iu'
    );
    if (streetTypePattern.test(q)) return q;

    const parts = q.split(' ').filter(Boolean);
    if (parts.length < 2) return q;

    const streetPart = parts.slice(1).join(' ');
    if (!streetPart) return q;

    return `${parts[0]} вул ${streetPart}`;
  }

  /**
   * Extract exact "lat, lng" coordinates from a Geodata address item.
   * Lat_S / Long_S are settlement-level fallback values: they can be identical
   * for different houses, so they must never become a ticket's coordinates.
   */
  getCoordinatesString(address: GeodataAddress): string | null {
    const lat = address.Lat ?? address.Lat_;
    const lng = address.Long ?? address.Long_;
    if (lat == null || lng == null || String(lat).trim() === '' || String(lng).trim() === '') return null;

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return null;
    }

    return `${latitude.toFixed(geoConfig.COORDINATE_PRECISION)}, ${longitude.toFixed(geoConfig.COORDINATE_PRECISION)}`;
  }

  /**
   * Get coordinates ("lat, lng") for a text address.
   * Address is an autocomplete endpoint, not the authoritative source of a
   * house point. Its Lat_S / Long_S values are deliberately ignored.
   *
   * FullAddress is the authoritative endpoint for a complete address. Address
   * remains a manual autocomplete endpoint and is deliberately not called
   * here: it returns 404 for many valid-but-incomplete/full address strings.
   * If FullAddress recognizes the address but cannot supply a point, use the
   * Postman collection's Cities -> Streets -> Houses chain as a last resort.
   */
  async resolveAddress(addressStr: string): Promise<GeodataAddressResolution | null> {
    if (!addressStr || !addressStr.trim()) return null;

    this.debug('coordinate lookup', { address: addressStr.trim(), source: 'FullAddress' });
    const full = await this.getFullAddress(addressStr);
    if (!full) return null;

    if (full.Comments) {
      this.debug('FullAddress diagnostic', {
        address: addressStr.trim(),
        comment: full.Comments,
        resolvedAddress: full.SourceAddress || full.AddressString || null
      });
    }

    const coords = this.getCoordinatesString(full);
    if (coords) {
      return { address: full, coordinates: coords };
    }

    const houseCoords = await this.getHouseCoordinates(full);
    if (!houseCoords) {
      console.warn('[Geodata] FullAddress and the house lookup returned no usable coordinates.');
    }
    return { address: full, coordinates: houseCoords };
  }

  async getCoordinates(addressStr: string): Promise<string | null> {
    const result = await this.resolveAddress(addressStr);
    return result?.coordinates ?? null;
  }

  private async getHouseCoordinates(address: GeodataAddress): Promise<string | null> {
    const cityName = address.City?.trim();
    const streetName = address.Street?.trim();
    const houseNumber = address.HouseNum?.trim();
    if (!cityName || !streetName || !houseNumber) return null;

    const cities = await this.searchCities(cityName, address.Region || undefined);
    const city = this.findExact(cities, cityName, (item) => item.City);
    const cityMoniker = city?.st_moniker?.trim();
    if (!cityMoniker) return null;

    const streets = await this.searchStreets(streetName, cityMoniker);
    const street = this.findExact(streets, streetName, (item) => item.Street);
    const streetMoniker = street?.house_moniker?.trim();
    if (!streetMoniker) return null;

    const houses = await this.searchHouses(houseNumber, streetMoniker);
    const house = this.findExact(houses, houseNumber, (item) => item.HouseNum);
    return house ? this.getCoordinatesString(house) : null;
  }

  private findExact<T>(items: T[], expected: string, getValue: (item: T) => string | null | undefined): T | undefined {
    const normalizedExpected = this.normalizeComparable(expected);
    // Never take the first suggestion as a substitute for an exact match.
    // A neighbouring house or a same-named street in another settlement would
    // make a ticket look correctly geocoded while pointing to the wrong place.
    return items.find((item) => this.normalizeComparable(getValue(item) || '') === normalizedExpected);
  }

  private normalizeComparable(value: string): string {
    return value.toLocaleLowerCase('uk-UA').replace(/[.\s-]/g, '');
  }

  /**
   * Get address string by coordinates
   */
  async getAddressByCoordinates(lat: number, lng: number): Promise<string | null> {
    const item = await this.reverseGeocode(lat, lng);
    return item?.AddressString || null;
  }
}

export const geodataService = new GeodataService();
export type { GeodataAddress };
