import type { NewUser, User } from './user.js';

/** Injection token for the port — the domain never names its adapter. */
export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  /** Throws `EmailAlreadyRegisteredError` when the e-mail is taken. */
  create(user: NewUser): Promise<User>;
  /** `null` when nobody is registered under that e-mail. Expects it normalised. */
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
