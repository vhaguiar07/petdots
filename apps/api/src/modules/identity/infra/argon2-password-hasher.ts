import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * argon2 is fixed by `SECURITY`; what is chosen here is the implementation.
 *
 * `@node-rs/argon2` ships a pre-compiled binary per platform, so it needs no
 * node-gyp and no Visual Studio Build Tools — which matters because the
 * repository has no other locally-compiled dependency and development happens
 * on Windows (ADR-0011, A5).
 *
 * The cost parameters are the library's defaults (argon2id, m=19456, t=2, p=1),
 * which are the OWASP baseline. They are not tuned here: tuning without
 * measuring on the machine that will run production is guessing, and every
 * stored hash records the parameters it was made with, so raising them later
 * only affects new hashes.
 */
@Injectable()
export class Argon2PasswordHasher {
  async hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      // A hash the library cannot parse is a wrong credential, not a server
      // error: a `500` here would tell the caller their guess was special.
      return false;
    }
  }
}
