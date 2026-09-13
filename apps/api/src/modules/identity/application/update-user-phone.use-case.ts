import { Inject, Injectable, Logger } from '@nestjs/common';
import { normalizeBrazilianMobilePhone } from '@petdots/domain';

import { type IUserRepository, USER_REPOSITORY } from '../domain/iuser.repository.js';

/**
 * Writes the tutor's mobile number onto the identity.
 *
 * The phone lives in `users` because it is how the platform reaches a *person*,
 * not a fact about their pets (DOMAIN_MODEL §Usuário: "`phone` entra com o
 * perfil de Tutor"). The profile form is what collects it, but `tutors` may not
 * write to `users` — a module only touches its own tables (CODING_STANDARDS),
 * so it asks for this use case the same way `offers` asks `catalog`.
 *
 * Normalising here rather than at the border is the rule fixed in pd-09 (A11):
 * the contract validates, the use case normalises, so the OpenAPI input and
 * output types stay identical.
 */
@Injectable()
export class UpdateUserPhoneUseCase {
  private readonly logger = new Logger(UpdateUserPhoneUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
  ) {}

  async execute(userId: string, rawPhone: string): Promise<string> {
    const phone = normalizeBrazilianMobilePhone(rawPhone);

    await this.users.updatePhone(userId, phone);

    // 🔴 The id and nothing else. A phone number is personal data and this line
    // goes to the log (NAMING_CONVENTIONS §Logs, SECURITY §LGPD).
    this.logger.log(`user phone updated (userId=${userId})`);

    return phone;
  }
}
