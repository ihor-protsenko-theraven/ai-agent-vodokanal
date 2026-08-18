import { wsnConfig } from '@/shared/config';

export interface TicketDraftCatalog {
  appealTypes: readonly string[];
  ticketTypes: readonly string[];
}

export const DEFAULT_TICKET_DRAFT_CATALOG: TicketDraftCatalog = {
  appealTypes: [
    ...wsnConfig.OPTIONS.APPEAL_TYPES,
    wsnConfig.CONSULTATION_APPEAL_TYPE
  ],
  ticketTypes: wsnConfig.OPTIONS.TICKET_TYPES
};

function normalizeValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/**
 * Produces a small immutable snapshot of the actual Forland catalogue for a
 * single Gemini request. The static catalogue is used only before Forland has
 * returned its live values.
 */
export function createTicketDraftCatalog(
  appealTypes: readonly string[],
  ticketTypes: readonly string[]
): TicketDraftCatalog {
  const normalizedAppealTypes = normalizeValues(appealTypes);
  const normalizedTicketTypes = normalizeValues(ticketTypes);

  return {
    appealTypes: normalizedAppealTypes.length > 0
      ? normalizedAppealTypes
      : [...DEFAULT_TICKET_DRAFT_CATALOG.appealTypes],
    ticketTypes: normalizedTicketTypes.length > 0
      ? normalizedTicketTypes
      : [...DEFAULT_TICKET_DRAFT_CATALOG.ticketTypes]
  };
}
