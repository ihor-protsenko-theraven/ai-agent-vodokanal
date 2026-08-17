import { describe, expect, it } from 'vitest';
import { aiConfig, resolveAiMode } from './ai.config';

describe('AI runtime mode', () => {
  it('uses local mode only when explicitly configured', () => {
    expect(resolveAiMode('local')).toBe('local');
    expect(resolveAiMode('gemini')).toBe('gemini');
    expect(resolveAiMode(undefined)).toBe('gemini');
  });

  it('uses the supported Gemini 2.5 Flash model only', () => {
    expect(aiConfig.GEMINI_MODEL).toBe('gemini-2.5-flash');
    expect(aiConfig.GEMINI_CANDIDATE_MODELS).toEqual(['gemini-2.5-flash']);
  });

  it('defines a strict WSN ticket-draft contract for Gemini', () => {
    expect(aiConfig.PROMPTS.SYSTEM).toContain('duplicatesFound: завжди []');
    expect(aiConfig.PROMPTS.SYSTEM).toContain('Ніколи не геокодуй і не вигадуй координати');
    expect(aiConfig.PROMPTS.SYSTEM).toContain('Поверни ТІЛЬКИ один валідний JSON');
  });
});
