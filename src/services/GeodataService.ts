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

export interface GeodataAddress {
  Id?: number;
  AddressString?: string | null;
  Index_?: string | null;
  Region?: string | null;
  Area?: string | null;
  City?: string | null;
  Suburb?: string | null;
  SettlementType?: string | null;
  KOATUU?: string | null;
  PhoneCode?: string | null;
  StreetId?: number | null;
  StrType?: string | null;
  Street?: string | null;
  HouseId?: number | null;
  HouseNum?: string | null;
  HouseNumAdd?: string | null;
  Lat?: string | null;
  Long?: string | null;
  Lat_?: string | null;
  Long_?: string | null;
  Lat_S?: string | null;
  Long_S?: string | null;
  AddressLevel?: string | null;
  CityDistrict?: string | null;
  MetroStation?: string | null;
  MetroLine?: string | null;
  MetroDistance?: string | null;
  KATO?: string | null;
  Hromada?: string | null;
  Distance?: string | null;
  TerrStatus?: string | null;
}

class GeodataService {
  private baseUrl: string = geoConfig.GEODATA_BASE_URL;
  private token: string = geoConfig.GEODATA_TOKEN;
  private defaultLang: string = geoConfig.GEODATA_LANG;

  private getHeaders(): HeadersInit {
    return { 'Authorization': `Bearer ${this.token}` };
  }

  private async get<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: this.getHeaders()
      });

      if (!res.ok) {
        console.warn(`[Geodata] ${path} returned status ${res.status}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (e) {
      console.warn('[Geodata] Request failed:', e);
      return null;
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
      const data = await this.get<GeodataAddress[]>(`/api/Address?${query}`);

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
    const data = await this.get<GeodataAddress[]>(`/api/FullAddress?${query}`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
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
    const data = await this.get<GeodataAddress[]>(`/api/ReverseGeocoding?${query}`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  /**
   * Build query candidates for the format-sensitive Address API.
   * 1. Raw request as-is.
   * 2. Normalized request (long street-type words shortened, punctuation cleaned).
   * 3. Normalized + street-type keyword inserted (when missing).
   */
  private buildQueryCandidates(request: string): string[] {
    const candidates: string[] = [];
    const normalized = this.normalizeRequest(request);

    candidates.push(request.trim());
    if (normalized !== request.trim()) {
      candidates.push(normalized);
    }

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

    q = q
      .replace(/\bвулиця\b/gi, 'вул')
      .replace(/\bвул\./gi, 'вул')
      .replace(/\bпроспект\b/gi, 'просп')
      .replace(/\bпровулок\b/gi, 'пров')
      .replace(/\bбульвар\b/gi, 'бул')
      .replace(/\bмайдан\b/gi, 'майд')
      .replace(/\bнабережна\b/gi, 'наб')
      .replace(/\bплоща\b/gi, 'площ')
      .replace(/\bмісто\b/gi, 'м.')
      .replace(/\bУкраїна\b/gi, '');

    // Collapse "м.", "вул." etc. dots to spaces and squeeze whitespace
    q = q
      .replace(/\./g, ' ')
      .replace(/[,;\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return q;
  }

  /**
   * If the address has no street-type keyword, insert "вул" between the
   * city (first token) and the street name, e.g.
   * "Житомир Київська 24" -> "Житомир вул Київська 24".
   */
  private ensureStreetKeyword(q: string): string {
    const hasStreetType = /\b(вул|вулиця|просп|проспект|пров|провулок|бул|бульвар|майд|майдан|шосе|наб|набережна|площ|площа)\b/i.test(q);
    if (hasStreetType) return q;

    const parts = q.split(' ').filter(Boolean);
    if (parts.length < 2) return q;

    const streetPart = parts.slice(1).join(' ');
    if (!streetPart) return q;

    return `${parts[0]} вул ${streetPart}`;
  }

  /**
   * Extract "lat, lng" string from a Geodata address item
   */
  getCoordinatesString(address: GeodataAddress): string | null {
    const lat = address.Lat ?? address.Lat_ ?? address.Lat_S;
    const lng = address.Long ?? address.Long_ ?? address.Long_S;
    if (!lat || !lng) return null;
    return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
  }

  /**
   * Get coordinates ("lat, lng") for a text address.
   * Uses free Address API first, then falls back to paid FullAddress API.
   */
  async getCoordinates(addressStr: string): Promise<string | null> {
    if (!addressStr || !addressStr.trim()) return null;

    const results = await this.searchAddress(addressStr);
    for (const item of results) {
      const coords = this.getCoordinatesString(item);
      if (coords) return coords;
    }

    const full = await this.getFullAddress(addressStr);
    return full ? this.getCoordinatesString(full) : null;
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
