import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthTokens, RegisterRequest, UserRole } from '@petdots/contracts';
import { assertPasswordIsAcceptable, normalizeEmail } from '@petdots/domain';

import { type IPasswordHasher, PASSWORD_HASHER } from '../domain/ipassword-hasher.js';
import { type IUserRepository, USER_REPOSITORY } from '../domain/iuser.repository.js';
import { SessionIssuer } from './session-issuer.js';

/**
 * 🔴 The role is decided here, never sent by the caller. Registration is an
 * open endpoint: a `roles` field in the body would be a request for `ADMIN`
 * away from privilege escalation. `STORE_MEMBER` arrives with store onboarding
 * and `ADMIN` only from the seed.
 */
const ROLES_AT_REGISTRATION: UserRole[] = ['TUTOR'];

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  /**
   * Creates the identity and starts a session for it.
   *
   * Creates a `User` and **nothing else**. The draft AUTHENTICATION says
   * registration creates a `Tutor`, but `Tutor` is a separate aggregate — the
   * consumption profile with pets, addresses and schedules — and it belongs to
   * capability 2 of the MVP_SCOPE. Creating one here would drag all of that
   * into this delivery (ADR-0011, A10).
   *
   * No `user.registered` event is emitted: there is no in-process event bus and
   * no consumer, and infrastructure without a user is premature (AGENTS.md) —
   * the same call the `pd-09` made for `waitlist.joined`.
   */
  async execute(input: RegisterRequest): Promise<AuthTokens> {
    // Normalising here rather than in the contract keeps the OpenAPI input and
    // output types identical (pd-09, A11). The policy is re-checked even though
    // the border already refused a short password: it is the domain's rule, and
    // the seed reaches it without passing through the border.
    const email = normalizeEmail(input.email);
    assertPasswordIsAcceptable(input.password);

    const user = await this.users.create({
      email,
      phone: null,
      passwordHash: await this.hasher.hash(input.password),
      roles: ROLES_AT_REGISTRATION,
    });

    // The user id, never the e-mail and never a fragment of the credential
    // (OBSERVABILITY §minimização, SECURITY).
    this.logger.log(`user registered (userId=${user.id})`);

    return this.sessions.issueFor(user);
  }
}
