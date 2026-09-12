export { areaCoversAddress, isPostalCodeRange } from './delivery-coverage.js';
export type { AddressQuery, DeliveryCoverageArea, PostalCodeRange } from './delivery-coverage.js';
export { DomainError } from './domain-error.js';
export { InvalidEmailError, isEmail, normalizeEmail } from './email.js';
export { applyBasisPoints, InvalidMoneyOperationError } from './money.js';
export {
  assertPasswordIsAcceptable,
  isAcceptablePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  WeakPasswordError,
} from './password-policy.js';
export { compareByItemPrice, compareByLandedPrice, landedPriceCents } from './offer-ranking.js';
export type { ItemPricedOffer, LandedOffer } from './offer-ranking.js';
export {
  InvalidPhoneNumberError,
  isBrazilianMobilePhone,
  normalizeBrazilianMobilePhone,
} from './phone.js';
export { InvalidPostalCodeError, isPostalCode, normalizePostalCode } from './postal-code.js';
export { assertProductCanBeOffered, ProductNotOfferableError } from './product-offerability.js';
export type { Offerability } from './product-offerability.js';
export { normalizeSearchText, searchTokens } from './search-text.js';
export { InvalidSlugError, isSlug, slugify } from './slug.js';
