import { DomainError } from '@petdots/domain';

/**
 * 🔴 The one error for every failed authentication: unknown e-mail, wrong
 * password, expired refresh token, revoked refresh token, deleted user.
 *
 * There is deliberately no sibling class and no reason code. Two distinguishable
 * answers would hand an attacker an oracle for "this e-mail has an account
 * here" — which, on a platform whose users are pet owners and shopkeepers in
 * one neighbourhood, is itself the personal data (LGPD, minimisation). The cost
 * is real and accepted: the person who mistypes their address gets the same
 * message as the person who mistypes their password.
 *
 * Whoever adds a case must keep it identical: same class, same message, same
 * status, same shape of body (ADR-0011, C3).
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('invalid credentials');
  }
}
