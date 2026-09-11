/** More tokens than this is a sentence, not a product search. */
const MAX_TOKENS = 8;

/**
 * Folds a string into the form the catalogue is searched by: no accents, no
 * case, single spaces.
 *
 * Both sides of the comparison go through this function — the stored
 * `search_text` column and the term the visitor typed — so `racao` finds
 * "Ração" without the database knowing anything about Portuguese. Full text
 * (`tsvector` + `unaccent`) is the next step, not this one: for a catalogue of
 * dozens of SKUs it would be infrastructure ahead of the need (ADR-0010, A5).
 */
export function normalizeSearchText(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Splits a normalised term into the tokens that are AND-ed by the query, so
 * `golden 15` finds "Golden Fórmula … 15 kg" and not every Golden.
 */
export function searchTokens(input: string): string[] {
  return normalizeSearchText(input).split(' ').filter(Boolean).slice(0, MAX_TOKENS);
}
