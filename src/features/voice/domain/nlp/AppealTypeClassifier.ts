/**
 * Classifies appeal type and ticket type from transcribed text.
 *
 * Returned appeal types MUST match the actual dropdown values loaded from
 * Forland GetList API (kindUnitID 27994) / wsnConfig.OPTIONS.APPEAL_TYPES.
 */

import { nlpConfig, wsnConfig } from '@/shared/config';

type AppealCategory = keyof typeof nlpConfig.APPEAL_TYPE_KEYWORDS;

export class AppealTypeClassifier {
  // Semantic category -> actual dropdown value from GetList (kindUnitID 27994)
  private static readonly CATEGORY_TO_VALUE: Record<AppealCategory, string> = {
    NO_WATER: 'Відсутність Води',
    CLOGGING: 'Закупорка',
    SEWER_LEAK: 'Витік на каналізації',
    DIRTY_WATER: 'Брудна вода',
    LOW_PRESSURE: 'Низький тиск води',
    PIPE_BURST: 'Витік води',
    COLLAPSE: 'Провал',
    LEAK: 'Витік води',
    OPEN_WELL: 'Відкритий колодязь',
    DAMAGED_COVER: 'Пошкоджена кришка колодязя',
    VALVE: 'Несправність засувки',
    METER_INSTALL: 'Встановлення лічильника',
    PIPE_REPLACEMENT: 'Заміна трубопроводу',
    PLANNED: 'Планові роботи',
    IMPROVEMENT: 'Благоустрій',
    CONSULTATION: wsnConfig.CONSULTATION_APPEAL_TYPE
  };

  // Detection priority resolves several facts in one call. A directly stated
  // service-quality issue (for example, low pressure) is more useful to the
  // dispatcher than a co-mentioned generic symptom such as a pipe burst.
  // Generic leak detection deliberately stays near the end.
  private static readonly DETECTION_ORDER: AppealCategory[] = [
    'NO_WATER',
    'SEWER_LEAK',
    'CLOGGING',
    'DIRTY_WATER',
    'LOW_PRESSURE',
    'COLLAPSE',
    'DAMAGED_COVER',
    'OPEN_WELL',
    'VALVE',
    'METER_INSTALL',
    'PIPE_REPLACEMENT',
    'PLANNED',
    'IMPROVEMENT',
    'PIPE_BURST',
    'LEAK',
    'CONSULTATION'
  ];

  /**
   * Returns an appeal type only when the transcript contains an explicit
   * domain signal. This is intentionally different from detectAppealType(),
   * whose default is kept for the offline parser's historical behaviour.
   */
  tryDetectAppealType(lowerText: string): string | null {
    const keywords = nlpConfig.APPEAL_TYPE_KEYWORDS;

    for (const category of AppealTypeClassifier.DETECTION_ORDER) {
      if (this.matchesCategory(category, lowerText, keywords)) {
        return AppealTypeClassifier.CATEGORY_TO_VALUE[category];
      }
    }

    return null;
  }

  private matchesCategory(
    category: AppealCategory,
    lowerText: string,
    keywords: typeof nlpConfig.APPEAL_TYPE_KEYWORDS
  ): boolean {
    // Mentioning sewerage alone is not a sewer leak: it may be a blockage.
    // A sewer-leak classification needs either a reference to wastewater/drains
    // or an explicit leak symptom next to a reference to sewerage.
    if (category === 'SEWER_LEAK') {
      const hasSewerReference = keywords.SEWER_LEAK.some((word) => lowerText.includes(word));
      const hasExplicitWastewater = lowerText.includes('стоки');
      const hasLeakSymptom = keywords.LEAK.some((word) => lowerText.includes(word));
      return hasSewerReference && (hasExplicitWastewater || hasLeakSymptom);
    }

    return keywords[category].some((word) => lowerText.includes(word));
  }

  /**
   * Detect appeal type across all scenarios.
   */
  detectAppealType(lowerText: string): string {
    return this.tryDetectAppealType(lowerText) ?? 'Витік води';
  }

  /**
   * Keeps the dependent ticket type deterministic when an explicit appeal
   * signal overrides a less specific LLM classification.
   */
  getTicketTypeForAppealType(appealType: string): string | null {
    if ([
      'Провал',
      'Відкритий колодязь',
      'Пошкоджена кришка колодязя',
      'Благоустрій'
    ].includes(appealType)) {
      return wsnConfig.OPTIONS.TICKET_TYPES[2];
    }

    if ([
      'Планові роботи',
      'Встановлення лічильника',
      'Заміна трубопроводу',
      wsnConfig.CONSULTATION_APPEAL_TYPE
    ].includes(appealType)) {
      return wsnConfig.OPTIONS.TICKET_TYPES[1];
    }

    if (Object.values(AppealTypeClassifier.CATEGORY_TO_VALUE).includes(appealType)) {
      return wsnConfig.OPTIONS.TICKET_TYPES[0];
    }

    return null;
  }

  /**
   * Classify ticket type into one of three WSN values:
   * "Аварійні роботи", "Планові роботи", "Благоустрій".
   */
  classifyTicketType(lowerText: string): string {
    const detectedAppealType = this.tryDetectAppealType(lowerText);
    const ticketTypeFromAppeal = detectedAppealType
      ? this.getTicketTypeForAppealType(detectedAppealType)
      : null;
    if (ticketTypeFromAppeal) {
      return ticketTypeFromAppeal;
    }

    const { IMPROVEMENT, PLANNED } = nlpConfig.TICKET_TYPE_KEYWORDS;

    if (IMPROVEMENT.some((word) => lowerText.includes(word))) {
      return wsnConfig.OPTIONS.TICKET_TYPES[2];
    }

    if (PLANNED.some((word) => lowerText.includes(word))) {
      return wsnConfig.OPTIONS.TICKET_TYPES[1];
    }

    return wsnConfig.OPTIONS.TICKET_TYPES[0];
  }

  isConsultation(appealType: string): boolean {
    return appealType === wsnConfig.CONSULTATION_APPEAL_TYPE;
  }
}
