import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthTokens, LoginRequest } from '@petdots/contracts';
import { isEmail, normalizeEmail } from '@petdots/domain';

import { InvalidCredentialsError } from '../domain/invalid-credentials.error.js';
import { type IPasswordHasher, PASSWORD_HASHER } from '../domain/ipassword-hasher.js';
import { type IUserRepository, USER_REPOSITORY } from '../domain/iuser.repository.js';
import type { User } from '../domain/user.js';
import { SessionIssuer } from './session-issuer.js';

/**
 * An argon2 hash of a value nobody knows, verified against when the e-mail
 * matches no account.
 *
 * Without it a login for an unknown address returns in under a millisecond
 * while a login for a known one spends ~50ms hashing — and that difference is
 * readable over the network. The identical error message of
 * `InvalidCredentialsError` would then be undone by a stopwatch.
 *
 * It has to be a **real** hash with the current cost parameters, not a
 * placeholder string: a hash the library cannot parse fails before doing any
 * work, which is the very difference this constant exists to erase. Generated
 * over 32 random bytes that were never written down, so no password verifies
 * against it.
 */
const ABSENT_USER_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$DRZCwWY9JKfGCgW1+lBV9w$xDGrg3qaPZZoc3m38n6ie3XhazJTdYv7AWrdXb0AeaI';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  /**
   * Exchanges credentials for a session.
   *
   * 🔴 Every failure leaves by the same door: unknown e-mail, malformed e-mail
   * and wrong password all raise `InvalidCredentialsError`, and all of them pay
   * the same hashing cost. Distinguishing them would tell an attacker which
   * addresses have an account here (ADR-0011, C3).
   */
  async execute(input: LoginRequest): Promise<AuthTokens> {
    const user = await this.findCandidate(input.email);
    const matches = await this.hasher.verify(
      user?.passwordHash ?? ABSENT_USER_HASH,
      input.password,
    );

    if (!user || !matches) {
      // No e-mail in the log either: a failed-login line naming an address is a
      // list of addresses (SECURITY, LGPD).
      this.logger.warn('login denied: invalid credentials');
      throw new InvalidCredentialsError();
    }

    this.logger.log(`login granted (userId=${user.id})`);

    return this.sessions.issueFor(user);
  }

  /**
   * An address the registration schema would refuse is simply an address nobody
   * registered — it must not short-circuit ahead of the password check, or the
   * shape of the attempt would change the shape of the answer.
   */
  private async findCandidate(email: string): Promise<User | null> {
    return isEmail(email) ? this.users.findByEmail(normalizeEmail(email)) : null;
  }
}
