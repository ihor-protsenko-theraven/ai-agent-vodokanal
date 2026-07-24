/**
 * Security utilities for sanitizing inputs and preventing DOM-based XSS vulnerabilities.
 */

/**
 * Escapes HTML special characters in a string to prevent XSS injection.
 * @param str The raw input string to escape
 * @returns HTML-safe string
 */
export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) {
    return '';
  }
  const stringified = String(str);
  return stringified
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
