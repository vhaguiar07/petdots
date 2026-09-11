import { InvalidSlugError, isSlug, slugify } from './slug.js';

describe('slugify', () => {
  it('folds accents so the URL is plain ASCII', () => {
    expect(slugify('Cães')).toBe('caes');
    expect(slugify('Golden Fórmula Cães Adultos')).toBe('golden-formula-caes-adultos');
  });

  it('turns a variant into a readable segment', () => {
    expect(slugify('15 kg')).toBe('15-kg');
    expect(slugify('2,5 kg')).toBe('2-5-kg');
    expect(slugify('10,1 kg')).toBe('10-1-kg');
  });

  it('collapses repeated separators instead of stacking hyphens', () => {
    expect(slugify('Ração   &   Cia')).toBe('racao-cia');
  });

  it('trims the separators at both ends', () => {
    expect(slugify('  --Méier--  ')).toBe('meier');
  });

  it('is idempotent, so re-slugging a slug is safe', () => {
    expect(slugify(slugify('Sanol Dog Tapete Higiênico'))).toBe(
      slugify('Sanol Dog Tapete Higiênico'),
    );
  });

  it('rejects an input with nothing usable', () => {
    expect(() => slugify('')).toThrow(InvalidSlugError);
    expect(() => slugify('---')).toThrow(InvalidSlugError);
    expect(() => slugify('%%%')).toThrow(InvalidSlugError);
  });
});

describe('isSlug', () => {
  it('accepts what slugify produces', () => {
    expect(isSlug('golden-formula-caes-adultos-15-kg')).toBe(true);
    expect(isSlug('meier')).toBe(true);
  });

  it('rejects spellings that would break a URL', () => {
    expect(isSlug('Golden')).toBe(false);
    expect(isSlug('golden--formula')).toBe(false);
    expect(isSlug('-golden')).toBe(false);
    expect(isSlug('golden-')).toBe(false);
    expect(isSlug('')).toBe(false);
  });
});
