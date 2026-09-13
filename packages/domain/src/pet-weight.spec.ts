import {
  assertPetWeightIsPlausible,
  ImplausiblePetWeightError,
  isPlausiblePetWeight,
  kilogramsToGrams,
  MAX_PET_WEIGHT_GRAMS,
  MIN_PET_WEIGHT_GRAMS,
} from './pet-weight.js';

describe('assertPetWeightIsPlausible', () => {
  it('accepts both bounds', () => {
    expect(() => {
      assertPetWeightIsPlausible(MIN_PET_WEIGHT_GRAMS);
    }).not.toThrow();
    expect(() => {
      assertPetWeightIsPlausible(MAX_PET_WEIGHT_GRAMS);
    }).not.toThrow();
  });

  it('rejects one gram outside either bound', () => {
    expect(() => {
      assertPetWeightIsPlausible(99);
    }).toThrow(ImplausiblePetWeightError);
    expect(() => {
      assertPetWeightIsPlausible(120_001);
    }).toThrow(ImplausiblePetWeightError);
  });

  it('rejects zero and a negative weight', () => {
    expect(() => {
      assertPetWeightIsPlausible(0);
    }).toThrow(ImplausiblePetWeightError);
    expect(() => {
      assertPetWeightIsPlausible(-12_500);
    }).toThrow(ImplausiblePetWeightError);
  });

  it('rejects a fractional gram — the column is an INT', () => {
    expect(() => {
      assertPetWeightIsPlausible(12_500.5);
    }).toThrow(ImplausiblePetWeightError);
  });
});

describe('isPlausiblePetWeight', () => {
  it('answers without throwing', () => {
    expect(isPlausiblePetWeight(12_500)).toBe(true);
    expect(isPlausiblePetWeight(0)).toBe(false);
    expect(isPlausiblePetWeight(12.5)).toBe(false);
  });
});

describe('kilogramsToGrams', () => {
  it('reads the comma a Brazilian keyboard types', () => {
    expect(kilogramsToGrams('12,5')).toBe(12_500);
  });

  it('reads the dot too, so the separator never changes the weight', () => {
    expect(kilogramsToGrams('12.5')).toBe(kilogramsToGrams('12,5'));
  });

  it('accepts a whole number of kilograms', () => {
    expect(kilogramsToGrams('12')).toBe(12_000);
  });

  it('ignores surrounding spaces', () => {
    expect(kilogramsToGrams('  3,2  ')).toBe(3_200);
  });

  it('accepts the smallest plausible pet', () => {
    expect(kilogramsToGrams('0,1')).toBe(100);
  });

  it('rounds to whole grams', () => {
    expect(kilogramsToGrams('12,55')).toBe(12_550);
    expect(kilogramsToGrams('12,5551')).toBe(12_555);
  });

  it('rejects what is not a number', () => {
    expect(() => kilogramsToGrams('abc')).toThrow(ImplausiblePetWeightError);
    expect(() => kilogramsToGrams('')).toThrow(ImplausiblePetWeightError);
    expect(() => kilogramsToGrams('12,5 kg')).toThrow(ImplausiblePetWeightError);
  });

  it('rejects a negative weight before it becomes grams', () => {
    expect(() => kilogramsToGrams('-3')).toThrow(ImplausiblePetWeightError);
  });

  it('rejects a weight outside the bounds', () => {
    expect(() => kilogramsToGrams('0,05')).toThrow(ImplausiblePetWeightError);
    expect(() => kilogramsToGrams('130')).toThrow(ImplausiblePetWeightError);
  });
});
