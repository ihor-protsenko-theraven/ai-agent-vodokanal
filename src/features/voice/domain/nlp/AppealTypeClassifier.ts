/**
 * Classifies appeal type and ticket type from transcribed text.
 *
 * Returned appeal types MUST match the actual dropdown values loaded from
 * Forland GetList API (kindUnitID 27994) / wsnConfig.OPTIONS.APPEAL_TYPES.
 */

import { nlpConfig, wsnConfig } from '@/shared/config';

type AppealCategory = keyof typeof nlpConfig.APPEAL_TYPE_KEYWORDS;

export interface AppealClassification {
  appealType: string | null;
  ticketType: string | null;
  evidence: string[];
  confidence: number;
  requiresManualReview: boolean;
}

export class AppealTypeClassifier {
  // Semantic category -> actual dropdown value from GetList (kindUnitID 27994)
  private static readonly CATEGORY_TO_VALUE: Record<AppealCategory, string> = {
    NO_WATER: 'Відсутність Води',
    CLOGGING: 'Закупорка',
    SEWER_LEAK: 'Витік каналізації',
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
    'OPEN_WELL',
    'DAMAGED_COVER',
    'VALVE',
    'METER_INSTALL',
    'PIPE_BURST',
    'LEAK',
    'PIPE_REPLACEMENT',
    'PLANNED',
    'IMPROVEMENT',
    'CONSULTATION'
  ];

  /**
   * Returns an appeal type only when the transcript contains an explicit
   * domain signal. This is intentionally different from detectAppealType(),
   * whose default is kept for the offline parser's historical behaviour.
   */
  tryDetectAppealType(lowerText: string): string | null {
    return this.classify(lowerText).appealType;
  }

  /**
   * Produces a decision together with the exact local evidence that led to it.
   * This lets callers distinguish a direct report from a weak generic word
   * such as "люк" and require operator review where appropriate.
   */
  classify(lowerText: string): AppealClassification {
    const keywords = nlpConfig.APPEAL_TYPE_KEYWORDS;

    for (const category of AppealTypeClassifier.DETECTION_ORDER) {
      const evidence = this.findEvidence(category, lowerText, keywords);
      if (evidence.length > 0) {
        const appealType = AppealTypeClassifier.CATEGORY_TO_VALUE[category];
        const isWeakGenericSignal = category === 'OPEN_WELL' && evidence.length === 1 && evidence[0] === 'люк';
        return {
          appealType,
          ticketType: this.getTicketTypeForAppealType(appealType),
          evidence,
          confidence: isWeakGenericSignal ? 0.58 : evidence.length > 1 ? 0.92 : 0.78,
          requiresManualReview: isWeakGenericSignal
        };
      }
    }

    return {
      appealType: null,
      ticketType: null,
      evidence: [],
      confidence: 0.35,
      requiresManualReview: true
    };
  }

  private findEvidence(
    category: AppealCategory,
    lowerText: string,
    keywords: typeof nlpConfig.APPEAL_TYPE_KEYWORDS
  ): string[] {
    const matchingKeywords = keywords[category].filter((word) => lowerText.includes(word));
    const leakEvidence = keywords.LEAK.filter((word) => lowerText.includes(word));

    if (category === 'NO_WATER') {
      const directAbsence = matchingKeywords.filter((word) => word !== 'відключ' && word !== 'відключенн');
      const disconnectionWithWater = matchingKeywords.filter(
        (word) => (word === 'відключ' || word === 'відключенн') && /вод[а-яіїєґ]*/iu.test(lowerText)
      );
      return [...directAbsence, ...disconnectionWithWater];
    }

    if (category === 'SEWER_LEAK') {
      const hasSewerReference = matchingKeywords.length > 0;
      const hasSurfaceDischarge = /поверхн|вилива|залива|підтоп/iu.test(lowerText);
      return hasSewerReference && (leakEvidence.length > 0 || hasSurfaceDischarge)
        ? [...matchingKeywords, ...leakEvidence]
        : [];
    }

    if (category === 'PIPE_BURST') {
      const directBurstWords = matchingKeywords.filter((word) =>
        ['порив', 'прорив', 'прорвало', 'гідроудар'].includes(word)
      );
      const hasPipelineLeak = matchingKeywords.some((word) => /водопровод/iu.test(word)) && leakEvidence.length > 0;
      return directBurstWords.length > 0
        ? directBurstWords
        : hasPipelineLeak
          ? [...matchingKeywords, ...leakEvidence]
          : [];
    }

    if (category === 'OPEN_WELL') {
      const hasCoverDamage = /кришк|зсунут|здвинут|тріщин|зламан/iu.test(lowerText);
      const hasOpenHazard = /відкрит|немає\s+кришк|без\s+кришк|отвір|небезпек/iu.test(lowerText);
      if (hasOpenHazard) return matchingKeywords;
      // A bare reference to a manhole is insufficient but can remain a draft
      // with an explicit manual-review requirement.
      return hasCoverDamage ? [] : matchingKeywords.filter((word) => word === 'люк');
    }

    if (category === 'DAMAGED_COVER') {
      const hasCoverContext = /кришк|зсунут|здвинут|тріщин|зламан/iu.test(lowerText);
      return hasCoverContext ? matchingKeywords.filter((word) => word !== 'пошкоджен.*кришк') : [];
    }

    return matchingKeywords;
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
