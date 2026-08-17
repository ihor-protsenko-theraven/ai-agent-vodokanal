/**
 * Finds possible WSN duplicates using the real Forland result set.
 */

import { TicketDuplicate, UnclosedTicketSummary } from '@/shared/types';
import { isLikelyAddressMatch } from './addressMatch';

export interface DuplicateFindOptions {
  addressText: string;
  coordinates: string;
  searchText: string;
  appealType: string;
}

const COORDINATE_TOLERANCE_DEGREES = 0.00001;

function parseCoordinates(value: string): [number, number] | null {
  const [latitudeRaw, longitudeRaw, ...rest] = value.split(',').map((part) => part.trim());
  if (rest.length > 0 || !latitudeRaw || !longitudeRaw) {
    return null;
  }

  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? [latitude, longitude]
    : null;
}

function hasCoordinateMatch(left: string, right: string): boolean {
  const leftPair = parseCoordinates(left);
  const rightPair = parseCoordinates(right);
  return leftPair !== null && rightPair !== null
    && Math.abs(leftPair[0] - rightPair[0]) <= COORDINATE_TOLERANCE_DEGREES
    && Math.abs(leftPair[1] - rightPair[1]) <= COORDINATE_TOLERANCE_DEGREES;
}

export class DuplicateFinder {
  /**
   * Finds conservative candidates in the already loaded list of active WSN
   * tickets. A hit is deliberately a candidate and never a confirmed
   * duplicate: the operator still makes the final WSN decision.
   */
  findPotentialDuplicates(
    options: DuplicateFindOptions,
    unclosedTickets: readonly UnclosedTicketSummary[]
  ): TicketDuplicate[] {
    const { addressText, coordinates, appealType } = options;

    return unclosedTickets
      .filter((ticket) => hasCoordinateMatch(coordinates, ticket.coordinates)
        || isLikelyAddressMatch(addressText, ticket.addressText || ticket.title))
      .map((ticket) => {
        const coordinatesMatch = hasCoordinateMatch(coordinates, ticket.coordinates);
        return {
        ticketId: String(ticket.id),
        matchReason: coordinatesMatch ? 'COORDINATES_MATCH' as const : 'ADDRESS_MATCH' as const,
        ticketTitle: ticket.title,
        addressText: ticket.addressText,
        coordinates: ticket.coordinates,
        ...(ticket.logId != null ? { logId: ticket.logId } : {}),
        ...(ticket.metaId != null ? { metaId: ticket.metaId } : {}),
        appealType
      };
      });
  }
}
