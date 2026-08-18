import { describe, expect, it } from 'vitest';
import { aiConfig, resolveAiMode } from './ai.config';
import { wsnConfig } from './wsn.config';

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

  it('keeps every actual WSN appeal and ticket type in the Gemini taxonomy', () => {
    const prompt = aiConfig.PROMPTS.SYSTEM;
    const appealTypes = [...wsnConfig.OPTIONS.APPEAL_TYPES, wsnConfig.CONSULTATION_APPEAL_TYPE];

    for (const appealType of appealTypes) {
      expect(prompt).toContain(`"${appealType}"`);
    }
    for (const ticketType of wsnConfig.OPTIONS.TICKET_TYPES) {
      expect(prompt).toContain(`"${ticketType}"`);
    }
  });

  it('documents the important ambiguity rules for Gemini', () => {
    const prompt = aiConfig.PROMPTS.SYSTEM;

    expect(prompt).toContain('"Витік на каналізації" → "Аварійні роботи"');
    expect(prompt).toContain('"Закупорка" → "Аварійні роботи"');
    expect(prompt).toContain('Повна відсутність води має пріоритет над слабким напором');
    expect(prompt).toContain('Активний прорив під час заміни — "Витік води" → "Аварійні роботи"');
  });
});
