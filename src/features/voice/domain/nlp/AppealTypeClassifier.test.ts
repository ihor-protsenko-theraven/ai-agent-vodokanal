import { describe, expect, it } from 'vitest';
import { AppealTypeClassifier } from './AppealTypeClassifier';

describe('AppealTypeClassifier', () => {
  const classifier = new AppealTypeClassifier();

  it('prioritises an explicit low-pressure report over a co-mentioned pipe burst', () => {
    const appealType = classifier.tryDetectAppealType(
      'повідомили про прорив за адресою вул. хрещатик, 20. заявник також зазначив про дуже низький тиск води.'
    );

    expect(appealType).toBe('Низький тиск води');
    expect(classifier.getTicketTypeForAppealType(appealType!)).toBe('Аварійні роботи');
  });

  it('prioritises a sewer leak over a co-mentioned blockage', () => {
    expect(
      classifier.tryDetectAppealType('каналізація засмічилась, а стоки течуть на поверхню')
    ).toBe('Витік на каналізації');
  });

  it('does not invent an explicit category when the transcript has no domain signal', () => {
    expect(classifier.tryDetectAppealType('доброго дня, хочу залишити звернення')).toBeNull();
  });
});
