/**
 * Finds duplicate WSN tickets by address or repeated-utterance keywords.
 */

import { TicketDuplicate } from '../types/ticket';
import { nlpConfig, wsnConfig } from '../config';
import { formatDateTimeLocal, generateWsnTicketId } from '../utils/wsn';

export interface DuplicateFindOptions {
  addressText: string;
  searchText: string;
  appealType: string;
}

export class DuplicateFinder {
  find(options: DuplicateFindOptions): TicketDuplicate[] {
    const { addressText, searchText, appealType } = options;
    const searchLower = searchText.toLowerCase();
    const addressLower = addressText.toLowerCase();

    const addressHit = nlpConfig.DUPLICATE_ADDRESS_KEYWORDS.some(
      (keyword) => addressLower.includes(keyword) || searchLower.includes(keyword)
    );
    const utteranceHit = nlpConfig.DUPLICATE_UTTERANCE_KEYWORDS.some((keyword) => searchLower.includes(keyword));

    if (!addressHit && !utteranceHit) {
      return [];
    }

    return [
      {
        ticketId: generateWsnTicketId(
          wsnConfig.CLASS_ID,
          wsnConfig.DEFAULT_STATUS_ID,
          nlpConfig.DUPLICATE_TICKET_ID_SUFFIX
        ),
        matchReason: 'ADDRESS_MATCH' as const,
        createdDate: formatDateTimeLocal(new Date()),
        status: `${wsnConfig.DEFAULT_STATUS_ID} (${wsnConfig.DEFAULT_STATUS_NAME})`,
        addressText,
        appealType
      }
    ];
  }
}
