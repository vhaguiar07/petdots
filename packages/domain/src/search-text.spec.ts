import { normalizeSearchText, searchTokens } from './search-text.js';

describe('normalizeSearchText', () => {
  it('folds the accents and the case into one comparable form', () => {
    expect(normalizeSearchText('Ração')).toBe('racao');
    expect(normalizeSearchText('MÉIER')).toBe(normalizeSearchText('méier'));
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeSearchText('  Golden   Fórmula  ')).toBe('golden formula');
  });

  it('keeps digits and punctuation the stored text also keeps', () => {
    expect(normalizeSearchText('Royal Canin 10,1 kg')).toBe('royal canin 10,1 kg');
  });
});

describe('searchTokens', () => {
  it('splits a multi-word term so the query can AND them', () => {
    expect(searchTokens('golden 15')).toEqual(['golden', '15']);
  });

  it('drops the empty pieces of a sloppy term', () => {
    expect(searchTokens('  golden    15  ')).toEqual(['golden', '15']);
  });

  it('answers with nothing for an empty term', () => {
    expect(searchTokens('')).toEqual([]);
    expect(searchTokens('   ')).toEqual([]);
  });

  it('caps the token count, so a pasted sentence is not a nine-way AND', () => {
    expect(searchTokens('a b c d e f g h i j')).toHaveLength(8);
  });
});
