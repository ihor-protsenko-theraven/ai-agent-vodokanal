/**
 * UI form types
 */

import { ConfidenceScores, WsnTicketData } from './ticket';

export type FormControlType = 'input' | 'textarea' | 'select' | 'datetime-local';

export interface FormFieldDefinition {
  label: string;
  fieldKey: keyof WsnTicketData;
  value: string;
  type: FormControlType;
  options?: string[];
  placeholder?: string;
  confidenceKey: keyof ConfidenceScores;
  confidenceScore: number;
  isRequired: boolean;
}
