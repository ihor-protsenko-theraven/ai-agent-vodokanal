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
    ).toBe('Витік каналізації');
  });

  it('does not classify sewerage alone as a sewer leak', () => {
    expect(classifier.tryDetectAppealType('каналізація засмітилась біля будинку')).toBe('Закупорка');
  });

  it('prioritises an open hole over a damaged cover when both are mentioned', () => {
    expect(
      classifier.tryDetectAppealType('кришка люка зламана, люк відкритий і є небезпечний отвір')
    ).toBe('Відкритий колодязь');
  });

  it('marks a bare manhole reference for manual review', () => {
    const result = classifier.classify('біля люка стоїть вода');

    expect(result).toMatchObject({
      appealType: 'Відкритий колодязь',
      requiresManualReview: true
    });
  });

  it('does not invent an explicit category when the transcript has no domain signal', () => {
    expect(classifier.tryDetectAppealType('доброго дня, хочу залишити звернення')).toBeNull();
  });
});
