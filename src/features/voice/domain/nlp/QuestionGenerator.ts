/**
 * Generates contextual suggested questions for a given appeal type.
 */

import { nlpConfig, speechConfig } from '@/shared/config';

export class QuestionGenerator {
  generate(appealType: string): string[] {
    if (appealType.includes('колодязь')) {
      return [...nlpConfig.APPEAL_SUGGESTED_QUESTIONS.MANHOLE];
    }
    if (appealType.includes('каналізац') || appealType.includes('Закупорка')) {
      return [...nlpConfig.APPEAL_SUGGESTED_QUESTIONS.SEWER];
    }
    if (appealType.includes('Відсутність') || appealType.includes('Низький тиск')) {
      return [...nlpConfig.APPEAL_SUGGESTED_QUESTIONS.NO_WATER];
    }
    return [...speechConfig.SUGGESTED_QUESTIONS];
  }
}
