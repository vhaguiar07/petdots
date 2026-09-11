import {
  areaCoversAddress,
  type DeliveryCoverageArea,
  isPostalCodeRange,
} from './delivery-coverage.js';

const MEIER: DeliveryCoverageArea = {
  neighborhoods: ['Méier', 'Todos os Santos'],
  postalCodeRanges: [{ from: '20720000', to: '20729999' }],
  active: true,
};

describe('isPostalCodeRange', () => {
  it('accepts two bare eight-digit CEPs in order', () => {
    expect(isPostalCodeRange({ from: '20720000', to: '20729999' })).toBe(true);
    expect(isPostalCodeRange({ from: '20720000', to: '20720000' })).toBe(true);
  });

  it('rejects an inverted range', () => {
    expect(isPostalCodeRange({ from: '20729999', to: '20720000' })).toBe(false);
  });

  it('rejects a hyphenated or short spelling, which would break the comparison', () => {
    expect(isPostalCodeRange({ from: '20720-000', to: '20729-999' })).toBe(false);
    expect(isPostalCodeRange({ from: '2072000', to: '20729999' })).toBe(false);
  });
});

describe('areaCoversAddress', () => {
  it('matches the neighbourhood regardless of accent and case', () => {
    expect(areaCoversAddress(MEIER, { neighborhood: 'meier' })).toBe(true);
    expect(areaCoversAddress(MEIER, { neighborhood: 'MÉIER' })).toBe(true);
    expect(areaCoversAddress(MEIER, { neighborhood: 'Todos os Santos' })).toBe(true);
  });

  it('does not match a neighbourhood outside the list', () => {
    expect(areaCoversAddress(MEIER, { neighborhood: 'Copacabana' })).toBe(false);
  });

  it('includes both edges of the postal range', () => {
    expect(areaCoversAddress(MEIER, { postalCode: '20720000' })).toBe(true);
    expect(areaCoversAddress(MEIER, { postalCode: '20729999' })).toBe(true);
  });

  it('excludes the CEPs just outside the range', () => {
    expect(areaCoversAddress(MEIER, { postalCode: '20719999' })).toBe(false);
    expect(areaCoversAddress(MEIER, { postalCode: '20730000' })).toBe(false);
  });

  it('accepts the hyphenated spelling of the address CEP', () => {
    expect(areaCoversAddress(MEIER, { postalCode: '20725-000' })).toBe(true);
  });

  it('covers when either side matches, not only both', () => {
    // The CEP is outside the range, but the neighbourhood is on the list.
    expect(areaCoversAddress(MEIER, { neighborhood: 'Méier', postalCode: '22070000' })).toBe(true);
  });

  it('covers nothing while the area is inactive', () => {
    const paused: DeliveryCoverageArea = { ...MEIER, active: false };

    expect(areaCoversAddress(paused, { neighborhood: 'Méier' })).toBe(false);
    expect(areaCoversAddress(paused, { postalCode: '20725000' })).toBe(false);
  });

  it('covers nothing for an empty address — the caller decides that case', () => {
    expect(areaCoversAddress(MEIER, {})).toBe(false);
    expect(areaCoversAddress(MEIER, { neighborhood: '  ', postalCode: '' })).toBe(false);
  });

  it('does not throw on a malformed CEP', () => {
    expect(areaCoversAddress(MEIER, { postalCode: '2072' })).toBe(false);
  });

  it('ignores a malformed stored range instead of matching everything', () => {
    const broken: DeliveryCoverageArea = {
      neighborhoods: [],
      postalCodeRanges: [{ from: '20729999', to: '20720000' }],
      active: true,
    };

    expect(areaCoversAddress(broken, { postalCode: '20725000' })).toBe(false);
  });
});
