import { wsnConfig } from '../config';
import { GetListItem, UnclosedTicketSummary } from '../types';

const WKT_POINT_PATTERN = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/iu;

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isGeographicCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
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
  return {
    id: item.ID,
    title: toText(item.Title) || 'Без назви WSN',
    addressText: formatForlandAddress(properties[wsnConfig.PROPERTIES.ADDRESS_TEXT]),
    coordinates: formatForlandCoordinates(properties[wsnConfig.PROPERTIES.COORDINATES]),
    ...(item.LogID != null ? { logId: item.LogID } : {}),
    ...(item.MetaID != null ? { metaId: item.MetaID } : {})
  };
}
