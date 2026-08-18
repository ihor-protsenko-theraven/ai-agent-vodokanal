import { describe, expect, it } from 'vitest';
import { withSelectedOption } from './selectOptions';

describe('withSelectedOption', () => {
  it('keeps an AI-selected WSN value visible when cached API options are stale', () => {
    expect(withSelectedOption(
      ['Благоустрій', 'Витік води'],
      'Витік каналізації'
    )).toEqual(['Витік каналізації', 'Благоустрій', 'Витік води']);
  });

  it('does not duplicate an option that is already in the catalogue', () => {
    expect(withSelectedOption(
      ['Благоустрій', 'Витік каналізації'],
      'Витік каналізації'
    )).toEqual(['Благоустрій', 'Витік каналізації']);
  });
});
