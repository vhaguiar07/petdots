import { DomainError } from './domain-error.js';

/** A slug is lowercase alphanumeric groups joined by single hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidSlugError extends DomainError {}

/**
 * Turns a human name into the public URL segment of a product or a store.
 *
 * The comparator's pages are the only organic acquisition asset of the MVP
 * (ADR-0004 #13), and a UUID in the path destroys that: `/precos/golden-formula
 * -caes-adultos-15-kg` is what a search engine and a shared link can read. The
 * transliteration is deliberate — `Cães` and `Caes` must reach the same page.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    // Strips the combining marks NFD just separated: `ã` → `a` + `~` → `a`.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new InvalidSlugError('the input has no character usable in a slug');
  }

  return slug;
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isSlug(value: string): boolean {
  return SLUG.test(value);
}
