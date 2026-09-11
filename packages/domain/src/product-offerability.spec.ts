import { assertProductCanBeOffered, ProductNotOfferableError } from './product-offerability.js';

describe('assertProductCanBeOffered', () => {
  it('lets an active product without prescription through', () => {
    expect(() =>
      assertProductCanBeOffered({ requiresPrescription: false, active: true }),
    ).not.toThrow();
  });

  it('refuses a product that requires a prescription', () => {
    expect(() => assertProductCanBeOffered({ requiresPrescription: true, active: true })).toThrow(
      ProductNotOfferableError,
    );
  });

  it('refuses an inactive product', () => {
    expect(() => assertProductCanBeOffered({ requiresPrescription: false, active: false })).toThrow(
      ProductNotOfferableError,
    );
  });

  it('says why without naming anyone — the message travels to logs', () => {
    expect(() => assertProductCanBeOffered({ requiresPrescription: true, active: true })).toThrow(
      /prescription/,
    );
  });
});
