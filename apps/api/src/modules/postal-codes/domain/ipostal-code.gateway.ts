import type { PostalCodeAddress } from '@petdots/contracts';

/** Injection token for the port — the domain never names its adapter. */
export const POSTAL_CODE_GATEWAY = Symbol('IPostalCodeGateway');

/**
 * The directory that turns a CEP into a street and a neighbourhood.
 *
 * 🔴 A **port**, and the reason this module exists at all. The directory is a
 * third party (today ViaCEP), and the whole point of putting our API in front
 * of it is that the client never learns its name: trocar de provedor é trocar
 * o adapter, e nada acima desta linha muda (ADR-0016).
 *
 * It is also what makes this module testable without touching the network —
 * the e2e injects a fake, because a suite that depends on somebody else's
 * uptime fails for reasons that have nothing to do with our code.
 */
export interface IPostalCodeGateway {
  /**
   * Expects the CEP already normalised to eight bare digits.
   *
   * `null` when the directory answers that no such CEP exists. A failure to
   * *reach* the directory raises instead — the two are different facts, and
   * collapsing them would tell someone their CEP is wrong when the truth is
   * that we could not ask.
   */
  findByPostalCode(postalCode: string): Promise<PostalCodeAddress | null>;
}
