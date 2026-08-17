/**
 * Dropdown data types
 */

import { ValueItem } from './forland';

export interface DropdownData {
  appealTypes: ValueItem[];
  ticketTypes: ValueItem[];
  isLoading: boolean;
  error: string | null;
}
