import { DomainError } from '@petdots/domain';

/**
 * This identity has no tutor profile yet.
 *
 * Not an exceptional condition: registering creates a `User` and nothing else
 * (ADR-0011, A10), so every account starts here. It is what tells the app
 * "perfil incompleto → onboarding".
 *
 * The message carries the user id and no personal data — it travels to logs.
 */
export class TutorProfileNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`no tutor profile for user ${userId}`);
  }
}
