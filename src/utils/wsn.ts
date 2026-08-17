/**
 * Shared WSN utilities: ticket IDs and local datetime formatting.
 */

export function generateWsnTicketId(
  classId: number,
  statusId: number,
  suffix: string = String(Math.floor(1000 + Math.random() * 9000))
): string {
  return `WSN-${classId}-${statusId}-${suffix}`;
}

export function generateCallId(prefix: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${random}`;
}

export function formatDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function formatDateTimeInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

/**
 * Format date for Forland API (with milliseconds and timezone)
 * Format: "2026-08-17T00:59:00.0000000" or "2026-08-17T00:00:00.0000000+03:00"
 */
export function formatForlandDateTime(date: Date): string {
  const isoString = date.toISOString();
  // ISO format: "2026-08-16T22:22:03.479Z"
  // Remove 'Z' and ensure proper 7-digit milliseconds
  const parts = isoString.split('.');
  if (parts.length === 2) {
    const milliseconds = parts[1].replace('Z', '');
    // Pad or truncate to 7 digits
    const paddedMs = milliseconds.padEnd(7, '0').slice(0, 7);
    return `${parts[0]}.${paddedMs}`;
  }
  // Fallback if no milliseconds
  return isoString.replace('Z', '.0000000');
}

/**
 * Format date for Forland API with minute precision (no seconds/milliseconds)
 * Format: "2026-08-16T22:24" or "16.08.2026 22:24"
 */
export function formatForlandDateTimeMinutePrecision(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format date for Forland API with minute precision and timezone
 * Format: "2026-08-16T22:24+03:00"
 */
export function formatForlandDateTimeMinutePrecisionWithTimezone(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset >= 0 ? '+' : '-';
  
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}${offsetString}`;
}

/**
 * Format date for Forland API with timezone offset
 * Format: "2026-08-17T00:00:00.0000000+03:00"
 */
export function formatForlandDateTimeWithTimezone(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset >= 0 ? '+' : '-';
  
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  
  const isoString = date.toISOString();
  const parts = isoString.split('.');
  
  if (parts.length === 2) {
    const milliseconds = parts[1].replace('Z', '');
    const paddedMs = milliseconds.padEnd(7, '0').slice(0, 7);
    return `${parts[0]}.${paddedMs}${offsetString}`;
  }
  
  return isoString.replace('Z', '.0000000') + offsetString;
}
