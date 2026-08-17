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

  // Detection priority: most specific categories first, generic "leak" default last
  private static readonly DETECTION_ORDER: AppealCategory[] = [
    'NO_WATER',
    'CLOGGING',
    'SEWER_LEAK',
    'DIRTY_WATER',
    'LOW_PRESSURE',
    'COLLAPSE',
    'LEAK',
    'OPEN_WELL',
    'DAMAGED_COVER',
    'VALVE',
    'METER_INSTALL',
    'PIPE_REPLACEMENT',
    'PLANNED',
    'IMPROVEMENT',
    'PIPE_BURST',
    'CONSULTATION'
  ];

  /**
   * Detect appeal type across all scenarios.
   */
  detectAppealType(lowerText: string): string {
    const k = nlpConfig.APPEAL_TYPE_KEYWORDS;

    for (const category of AppealTypeClassifier.DETECTION_ORDER) {
      if (k[category].some((word) => lowerText.includes(word))) {
        return AppealTypeClassifier.CATEGORY_TO_VALUE[category];
      }
    }

    return 'Витік води';
  }

  /**
   * Classify ticket type into one of three WSN values:
   * "Аварійні роботи", "Планові роботи", "Благоустрій".
   */
  classifyTicketType(lowerText: string): string {
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
