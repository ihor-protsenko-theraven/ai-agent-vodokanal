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
