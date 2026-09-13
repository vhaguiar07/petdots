/**
 * Applies a progressive mask to what the person just typed.
 *
 * 🔴 The whole reason this is not a plain `format(next)`: **backspace over a
 * separator**. The mask is derived from the digits, so deleting the `-` of
 * `20720-000` leaves the same eight digits, and re-formatting puts the hyphen
 * straight back — the key appears to do nothing, and the field becomes a trap.
 *
 * So: when the text got shorter but the digits did not, the person deleted a
 * separator, and we drop one digit on their behalf. Backspace then always makes
 * progress, which is the only behaviour anyone expects from it.
 */
export function applyMask(current: string, next: string, format: (raw: string) => string): string {
  const digits = digitsOf(next);
  const deletedASeparator = next.length < current.length && digits === digitsOf(current);

  return format(deletedASeparator ? digits.slice(0, -1) : digits);
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}
