import { describe, expect, it } from 'vitest';
import { resolveAiMode } from './ai.config';

describe('AI runtime mode', () => {
  it('uses local mode only when explicitly configured', () => {
    expect(resolveAiMode('local')).toBe('local');
    expect(resolveAiMode('gemini')).toBe('gemini');
    expect(resolveAiMode(undefined)).toBe('gemini');
  });
});
