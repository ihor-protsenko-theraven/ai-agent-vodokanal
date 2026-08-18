import { describe, expect, it } from 'vitest';
import { aiConfig, resolveAiMode } from './ai.config';

describe('AI runtime mode', () => {
  it('uses local mode only when explicitly configured', () => {
    expect(resolveAiMode('local')).toBe('local');
    expect(resolveAiMode('gemini')).toBe('gemini');
    expect(resolveAiMode(undefined)).toBe('gemini');
  });

  it('uses the selected high-quality Flash models with a Flash-Lite fallback', () => {
    expect(aiConfig.GEMINI_MODEL).toBe('gemini-3.7-flash');
    expect(aiConfig.GEMINI_CANDIDATE_MODELS).toEqual([
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite'
    ]);
  });

  it('defines a strict WSN ticket-draft contract for Gemini', () => {
    expect(aiConfig.PROMPTS.SYSTEM).toContain('duplicatesFound: завжди []');
    expect(aiConfig.PROMPTS.SYSTEM).toContain('Ніколи не геокодуй і не вигадуй координати');
    expect(aiConfig.PROMPTS.SYSTEM).toContain('Поверни ТІЛЬКИ один валідний JSON');
  });

  it('requires the live Forland catalogue provided with each Gemini request', () => {
    const prompt = aiConfig.PROMPTS.SYSTEM;

    expect(prompt).toContain('АКТУАЛЬНИЙ КАТАЛОГ WSN');
    expect(prompt).toContain('catalog.appealTypes');
    expect(prompt).toContain('catalog.ticketTypes');
  });

  it('documents the important ambiguity rules for Gemini', () => {
    const prompt = aiConfig.PROMPTS.SYSTEM;

    expect(prompt).toContain('"Витік каналізації" → "Аварійні роботи"');
    expect(prompt).toContain('"Закупорка" → "Аварійні роботи"');
    expect(prompt).toContain('Повна відсутність води має пріоритет над слабким напором');
    expect(prompt).toContain('Активний прорив під час заміни — "Витік води" → "Аварійні роботи"');
    expect(prompt).toContain('аудіо є джерелом істини');
    expect(prompt).toContain('CALL_CAPTURED_AT_KYIV');
  });
});
