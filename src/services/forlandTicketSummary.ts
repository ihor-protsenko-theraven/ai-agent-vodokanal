import { wsnConfig } from '../config';
import { GetListItem, UnclosedTicketSummary } from '../types';

const WKT_POINT_PATTERN = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/iu;
const DOTNET_UNIX_EPOCH_TICKS = 621355968000000000n;
const TICKS_PER_MILLISECOND = 10000n;
const TITLE_DATE_PATTERN = /\[(\d{2})\.(\d{2})\.(\d{4})\]/u;

export type UnclosedTicketSort = 'newest' | 'oldest';

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isGeographicCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}

function getCreatedAtFromLogId(logId: unknown): string | undefined {
  const raw = String(logId ?? '').trim();
  if (!/^\d{18,19}$/.test(raw)) return undefined;

  try {
    const milliseconds = (BigInt(raw) - DOTNET_UNIX_EPOCH_TICKS) / TICKS_PER_MILLISECOND;
    const timestamp = Number(milliseconds);
    const date = new Date(timestamp);
    // Guard against another numeric identifier that only happens to have a
    // similar length; LogID ticks should resolve to a plausible modern date.
    if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

function getCreatedAtFromTitle(title: string): string | undefined {
  const match = title.match(TITLE_DATE_PATTERN);
  if (!match) return undefined;

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function sortUnclosedTickets(
  tickets: readonly UnclosedTicketSummary[],
  direction: UnclosedTicketSort
): UnclosedTicketSummary[] {
  const multiplier = direction === 'newest' ? -1 : 1;
  const toTimestamp = (ticket: UnclosedTicketSummary): number | null => {
    if (!ticket.createdAt) return null;
    const value = Date.parse(ticket.createdAt);
    return Number.isNaN(value) ? null : value;
  };

  return [...tickets].sort((left, right) => {
    const leftTime = toTimestamp(left);
    const rightTime = toTimestamp(right);
    if (leftTime == null && rightTime == null) return right.id - left.id;
    if (leftTime == null) return 1;
    if (rightTime == null) return -1;
    return (leftTime - rightTime) * multiplier || (right.id - left.id);
  });
}

export function formatForlandAddress(value: unknown): string {
  return toText(value)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^(?:undefined|null)$/iu.test(part))
    .join(', ');
}

/** Converts Forland's POINT(longitude latitude) WKT into `latitude, longitude`. */
export function formatForlandCoordinates(value: unknown): string {
  const wkt = typeof value === 'object' && value !== null
    ? toText((value as Record<string, unknown>).wkt)
    : toText(value);
  const match = wkt.match(WKT_POINT_PATTERN);

  if (match) {
    const longitude = Number(match[1]);
    const latitude = Number(match[2]);
    if (isGeographicCoordinate(latitude, longitude)) {
      return `${latitude}, ${longitude}`;
    }
  }

  const [latitudeRaw, longitudeRaw, ...rest] = toText(value).split(',').map((part) => part.trim());
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  return rest.length === 0 && isGeographicCoordinate(latitude, longitude)
    ? `${latitude}, ${longitude}`
    : '';
}

export function toUnclosedTicketSummary(item: GetListItem): UnclosedTicketSummary {
  const properties = item.Init?.Properties ?? {};
  const title = toText(item.Title) || 'Без назви WSN';
  const createdAt = getCreatedAtFromLogId(item.LogID) || getCreatedAtFromTitle(title);
  return {
    id: item.ID,
    title,
    ...(createdAt ? { createdAt } : {}),
    addressText: formatForlandAddress(properties[wsnConfig.PROPERTIES.ADDRESS_TEXT]),
    coordinates: formatForlandCoordinates(properties[wsnConfig.PROPERTIES.COORDINATES]),
    ...(item.LogID != null ? { logId: item.LogID } : {}),
    ...(item.MetaID != null ? { metaId: item.MetaID } : {})
  };
}
