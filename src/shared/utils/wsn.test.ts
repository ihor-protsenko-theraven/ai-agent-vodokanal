import { describe, expect, it } from 'vitest';
import { formatDateTimeInput, formatDateTimeLocal, formatForlandDateTimeWithTimezone } from './wsn';

describe('WSN date formatting', () => {
  const date = new Date(2026, 7, 17, 9, 5, 6, 123);

  it('formats datetime-local values in the local timezone', () => {
    expect(formatDateTimeInput(date)).toBe('2026-08-17T09:05');
    expect(formatDateTimeLocal(date)).toBe('2026-08-17 09:05');
  });

  it('uses local wall-clock components with an explicit timezone', () => {
    expect(formatForlandDateTimeWithTimezone(date)).toMatch(/^2026-08-17T09:05:06\.1230000[+-]\d{2}:\d{2}$/);
  });
});
