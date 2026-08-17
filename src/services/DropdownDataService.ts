/**
 * Dropdown Data Service
 * Manages dropdown options loaded from Forland API
 */

import { forlandApiService } from './ForlandApiService';
import { ValueItem } from '../types';
import { DropdownData } from '../types';
import { wsnConfig } from '../config';

class DropdownDataService {
  private static STORAGE_KEY = 'wsn_dropdown_data';

  private data: DropdownData = {
    appealTypes: [],
    ticketTypes: [],
    isLoading: false,
    error: null
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.restoreFromCache();
  }

  /**
   * Restore dropdown options from localStorage so they are available immediately after a page refresh.
   */
  private restoreFromCache(): void {
    try {
      const raw = localStorage.getItem(DropdownDataService.STORAGE_KEY);
      if (!raw) return;

      const cached = JSON.parse(raw) as { appealTypes?: ValueItem[]; ticketTypes?: ValueItem[] };
      if (Array.isArray(cached.appealTypes)) {
        this.data.appealTypes = cached.appealTypes;
      }
      if (Array.isArray(cached.ticketTypes)) {
        this.data.ticketTypes = cached.ticketTypes;
      }
    } catch {
      // Ignore corrupted cache
    }
  }

  /**
   * Persist current dropdown options to localStorage.
   */
  private saveToCache(): void {
    try {
      localStorage.setItem(
        DropdownDataService.STORAGE_KEY,
        JSON.stringify({
          appealTypes: this.data.appealTypes,
          ticketTypes: this.data.ticketTypes,
          savedAt: Date.now()
        })
      );
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }

  /**
   * Load dropdown data from API
   */
  async loadDropdownData(): Promise<void> {
    if (this.data.isLoading) {
      return;
    }

    this.data.isLoading = true;
    this.data.error = null;
    this.notify();

    try {
      // Ticket types using system type ID (10197 for "Тип заявки")
      const ticketTypesData = await forlandApiService.getDropdownOptionsBySystemType(
        wsnConfig.PROPERTIES.TICKET_TYPE_SYSTEM_ID
      );

      if (ticketTypesData) {
        this.data.ticketTypes = ticketTypesData;
      }

      // Appeal types (Тип звернення) from GetList API by kindUnitID
      const appealTypesData = await forlandApiService.getList({
        kindUnitID: wsnConfig.APPEAL_TYPE_KIND_UNIT_ID,
        stateID: wsnConfig.ANY_STATE_ID
      });

      if (appealTypesData) {
        this.data.appealTypes = appealTypesData;
      }

      // If API fails for ticket types, fall back to static config
      if (!ticketTypesData || ticketTypesData.length === 0) {
        this.data.ticketTypes = wsnConfig.OPTIONS.TICKET_TYPES.map((value, index) => ({
          ID: index + 1,
          Value: value
        }));
      }

      // If API fails for appeal types, fall back to static config
      if (!appealTypesData || appealTypesData.length === 0) {
        this.data.appealTypes = wsnConfig.OPTIONS.APPEAL_TYPES.map((value, index) => ({
          ID: index + 1,
          Value: value
        }));
      }

      this.saveToCache();

    } catch (error) {
      console.error('Failed to load dropdown data:', error);
      this.data.error = 'Не вдалося завантажити дані для дропдаунів. Використовуються стандартні значення.';

      // Fallback to static config
      this.data.appealTypes = wsnConfig.OPTIONS.APPEAL_TYPES.map((value, index) => ({
        ID: index + 1,
        Value: value
      }));
      this.data.ticketTypes = wsnConfig.OPTIONS.TICKET_TYPES.map((value, index) => ({
        ID: index + 1,
        Value: value
      }));
    } finally {
      this.data.isLoading = false;
      this.notify();
    }
  }

  /**
   * Get appeal types
   */
  getAppealTypes(): ValueItem[] {
    return this.data.appealTypes;
  }

  /**
   * Get ticket types
   */
  getTicketTypes(): ValueItem[] {
    return this.data.ticketTypes;
  }

  /**
   * Get appeal type by ID
   */
  getAppealTypeById(id: number): string | undefined {
    return this.data.appealTypes.find(item => item.ID === id)?.Value;
  }

  /**
   * Get ticket type by ID
   */
  getTicketTypeById(id: number): string | undefined {
    return this.data.ticketTypes.find(item => item.ID === id)?.Value;
  }

  /**
   * Get appeal type ID by value (text)
   */
  getAppealTypeId(value: string): number | undefined {
    const found = this.data.appealTypes.find(item => item.Value === value);
    return found?.ID;
  }

  /**
   * Get ticket type ID by value (text)
   */
  getTicketTypeId(value: string): number | undefined {
    const found = this.data.ticketTypes.find(item => item.Value === value);
    return found?.ID;
  }

  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.data.isLoading;
  }

  /**
   * Check if any dropdown data is already available (from cache or API)
   */
  hasData(): boolean {
    return this.data.appealTypes.length > 0 || this.data.ticketTypes.length > 0;
  }

  /**
   * Get error message
   */
  getError(): string | null {
    return this.data.error;
  }

  /**
   * Subscribe to data changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const dropdownDataService = new DropdownDataService();
