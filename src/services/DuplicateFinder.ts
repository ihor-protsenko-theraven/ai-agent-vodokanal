/**
 * Finds duplicate WSN tickets by address or repeated-utterance keywords.
 * Now includes real API-based duplicate checking against Forland database.
 */

import { TicketDuplicate } from '../types';
import { nlpConfig, wsnConfig } from '../config';
import { formatDateTimeLocal, generateWsnTicketId } from '../utils/wsn';
import { forlandApiService } from './ForlandApiService';

export interface DuplicateFindOptions {
  addressText: string;
  searchText: string;
  appealType: string;
}

export class DuplicateFinder {
  /**
   * Local keyword-based duplicate detection (fallback method)
   */
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

  /**
   * Real API-based duplicate detection against Forland database
   * Checks all unclosed tickets for potential duplicates based on address similarity
   */
  async findRealDuplicates(options: DuplicateFindOptions): Promise<TicketDuplicate[]> {
    const { addressText, appealType } = options;
    
    try {
      // Get all unclosed tickets from Forland
      const unclosedTickets = await forlandApiService.getUnclosedTickets(
        wsnConfig.CLASS_ID,
        wsnConfig.UNCLOSED_STATE_IDS
      );

      if (!unclosedTickets || unclosedTickets.length === 0) {
        return [];
      }

      // Filter tickets by address similarity (simple contains check for now)
      const addressLower = addressText.toLowerCase();
      const duplicates: TicketDuplicate[] = [];

      for (const ticket of unclosedTickets) {
        const ticketTitle = ticket.Value.toLowerCase();
        
        // Check if ticket title contains address keywords or similar address
        const addressMatch = addressLower.split(' ').some(word => 
          word.length > 3 && ticketTitle.includes(word)
        );

        if (addressMatch) {
          duplicates.push({
            ticketId: `WSN-${ticket.ID}`,
            matchReason: 'ADDRESS_MATCH' as const,
            createdDate: formatDateTimeLocal(new Date()), // Would need real date from API
            status: 'Активна заявка',
            addressText: ticket.Value,
            appealType
          });
        }
      }

      return duplicates;
    } catch (error) {
      console.error('Error finding real duplicates:', error);
      // Fallback to local detection if API fails
      return this.find(options);
    }
  }
}
