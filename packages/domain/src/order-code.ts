/**
 * The alphabet an order code is drawn from: uppercase letters and digits, minus
 * the four characters that are read wrong over a counter — `0`/`O` and `1`/`I`.
 *
 * The code exists to be **said out loud** ("o pedido PDX-… ", `DOMAIN_MODEL`:
 * "o número que o lojista diz no telefone"), which is also why the order's UUID
 * is not it. Nobody dictates a UUID.
 */
export const ORDER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ORDER_CODE_LENGTH = 6;

const ORDER_CODE = new RegExp(`^[${ORDER_CODE_ALPHABET}]{${String(ORDER_CODE_LENGTH)}}$`);

/**
 * A fresh code.
 *
 * `random` is a parameter so the test is deterministic; the default is what
 * production uses. The space is 32⁶ ≈ 1.07 billion, which makes a collision
 * improbable but not impossible — the repository retries once on the unique
 * violation rather than pretending it cannot happen.
 */
export function generateOrderCode(random: () => number = Math.random): string {
  let code = '';

  for (let index = 0; index < ORDER_CODE_LENGTH; index += 1) {
    const position = Math.floor(random() * ORDER_CODE_ALPHABET.length);
    // `random()` returning exactly 1 would index past the end; clamping costs
    // nothing and removes the only way this can produce `undefined`.
    code += ORDER_CODE_ALPHABET[Math.min(position, ORDER_CODE_ALPHABET.length - 1)] ?? 'A';
  }

  return code;
}

export function isOrderCode(value: string): boolean {
  return ORDER_CODE.test(value);
}
