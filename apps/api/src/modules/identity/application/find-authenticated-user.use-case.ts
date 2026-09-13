import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@petdots/contracts';

import { InvalidCredentialsError } from '../domain/invalid-credentials.error.js';
import { type IUserRepository, USER_REPOSITORY } from '../domain/iuser.repository.js';

/**
 * Who the caller currently is — the session as the server sees it.
 *
 * The row is re-read instead of echoing the token's claims. An access token is
 * a fifteen-minute-old copy: the e-mail is not in it at all, roles granted or
 * revoked since it was minted are stale in it, and an account deleted a minute
 * ago still has a token that verifies. The line in the table is the truth
 * (pd-13, A14 — the same principle the refresh use case already applies).
 */
@Injectable()
export class FindAuthenticatedUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);

    if (!user) {
      // A valid token whose subject no longer exists is not a different kind of
      // failure — it leaves by the one door every authentication failure uses.
      throw new InvalidCredentialsError();
    }

    // 🔴 Field by field, never a spread of the `User`: a spread would carry
    // `passwordHash` here the day someone adds a column (ADR-0011, C6).
    return { id: user.id, email: user.email, phone: user.phone, roles: user.roles };
  }
}
