import { WsnTicketData } from '@/shared/types';
import { TicketDraftCatalog, DEFAULT_TICKET_DRAFT_CATALOG } from '@/features/voice/domain/TicketDraftCatalog';

export interface LocalTicketCandidate {
  appealType: string | null;
  ticketType: string | null;
  applicantName: string | null;
  applicantAddress: string | null;
  phoneNumber: string | null;
  addressText: string | null;
}

export interface TicketDraftMergeInput {
  modelTicket: Partial<WsnTicketData>;
  localCandidate: LocalTicketCandidate | null;
  catalog?: TicketDraftCatalog;
}

const LOCAL_APPEAL_OVERRIDES = new Set([
  // These signals resolve known WSN ambiguities where an explicit statement in
  // the transcript is more precise than a generic model result such as leak.
  'Відсутність Води',
  'Низький тиск води',
  'Витік каналізації'
]);

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAllowedAppealType(value: string | null, catalog: TicketDraftCatalog): value is string {
  return Boolean(value && catalog.appealTypes.includes(value));
}

function isAllowedTicketType(value: string | null, catalog: TicketDraftCatalog): value is string {
  return Boolean(value && catalog.ticketTypes.includes(value));
}

/**
 * Merges an audio-model draft with deterministic local extraction.
 *
 * The audio model remains the preferred source for valid values. Local NLP is
 * a fallback for a missing/invalid field, except for three documented,
 * explicit appeal signals that correct a broader classification.
 */
export class TicketDraftMerger {
  merge({ modelTicket, localCandidate, catalog = DEFAULT_TICKET_DRAFT_CATALOG }: TicketDraftMergeInput): Partial<WsnTicketData> {
    const modelAppealType = nonEmptyString(modelTicket.appealType);
    const localAppealType = localCandidate?.appealType ?? null;
    const useLocalAppealOverride = Boolean(
      localAppealType && LOCAL_APPEAL_OVERRIDES.has(localAppealType) && isAllowedAppealType(localAppealType, catalog)
    );

    const appealType = useLocalAppealOverride
      ? localAppealType!
      : isAllowedAppealType(modelAppealType, catalog)
        ? modelAppealType
        : isAllowedAppealType(localAppealType, catalog)
          ? localAppealType
          : '';

    const modelTicketType = nonEmptyString(modelTicket.ticketType);
    const ticketType = useLocalAppealOverride
      ? localCandidate?.ticketType ?? ''
      : isAllowedTicketType(modelTicketType, catalog)
        ? modelTicketType
        : isAllowedTicketType(localCandidate?.ticketType ?? null, catalog)
          ? localCandidate!.ticketType!
          : '';

    const addressText = nonEmptyString(modelTicket.addressText) ?? localCandidate?.addressText ?? '';
    const applicantAddress = nonEmptyString(modelTicket.applicantAddress)
      ?? localCandidate?.applicantAddress
      // The operator explicitly chose this business rule: when a residence
      // was not dictated, use the incident address instead of a fake blank.
      ?? addressText;

    return {
      ...modelTicket,
      appealType,
      ticketType,
      // A browser transcript is a fallback here, not an overwrite of a model
      // result obtained from the actual audio.
      applicantName: nonEmptyString(modelTicket.applicantName) ?? localCandidate?.applicantName ?? '',
      phoneNumber: nonEmptyString(modelTicket.phoneNumber) ?? localCandidate?.phoneNumber ?? '',
      addressText,
      applicantAddress,
      // Coordinates are resolved by the trusted geocoder after the merge;
      // do not retain an unverified point returned by a language model.
      coordinates: ''
    };
  }
}
