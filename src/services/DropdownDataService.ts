/**
 * Dropdown Data Service
 * Manages dropdown options loaded from Forland API
 */

import { forlandApiService, ValueItem } from './ForlandApiService';
import { wsnConfig } from '../config';

interface DropdownData {
  appealTypes: ValueItem[];
  ticketTypes: ValueItem[];
  isLoading: boolean;
  error: string | null;
}

class DropdownDataService {
  private data: DropdownData = {
    appealTypes: [],
    ticketTypes: [],
    isLoading: false,
    error: null
  };

  private listeners: Set<() => void> = new Set();

  /**
   * Load dropdown data from API
   */
  async loadDropdownData(): Promise<void> {
    this.data.isLoading = true;
    this.data.error = null;
    this.notify();

    try {
      // Load ticket types using system type ID (10197 for "Тип заявки")
      const ticketTypesData = await forlandApiService.getDropdownOptionsBySystemType(
        wsnConfig.PROPERTIES.TICKET_TYPE_SYSTEM_ID
      );

      if (ticketTypesData) {
        this.data.ticketTypes = ticketTypesData;
      }

      // Appeal types (Тип звернення) use static config - not available via API
      this.data.appealTypes = wsnConfig.OPTIONS.APPEAL_TYPES.map((value, index) => ({
        ID: index + 1,
        Value: value
      }));

      // If API fails for ticket types, fall back to static config
      if (!ticketTypesData || ticketTypesData.length === 0) {
        this.data.ticketTypes = wsnConfig.OPTIONS.TICKET_TYPES.map((value, index) => ({
          ID: index + 1,
          Value: value
        }));
      }

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
   * Check if loading
   */
  isLoading(): boolean {
    return this.data.isLoading;
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
