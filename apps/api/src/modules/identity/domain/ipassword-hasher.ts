/** Injection token for the port — the domain never names its adapter. */
export const PASSWORD_HASHER = Symbol('IPasswordHasher');

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  /** Answers `false` for a wrong password *and* for a malformed hash; never throws. */
  verify(hash: string, password: string): Promise<boolean>;
}
