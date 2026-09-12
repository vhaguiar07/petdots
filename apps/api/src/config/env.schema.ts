import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Comma-separated list of browser origins allowed to call the API. Absent
  // means CORS stays off, which is the behaviour the API had before `apps/app`
  // existed: a server-to-server client never needs it, and a permissive default
  // would be a security decision taken by omission.
  CORS_ORIGINS: z.string().optional(),
  // Signing key of the access token. Required, with no default, on purpose: a
  // secret that has a default is a secret that reaches production. The API
  // already refuses to boot on a bad environment, so a missing key is a crash
  // at startup instead of tokens anyone can forge (SECURITY §Gestão de
  // segredos, ADR-0011 passo 7). 32 characters is the floor for HS256.
  JWT_SECRET: z.string().min(32),
  // Lifetime of the access token, in the notation `@nestjs/jwt` accepts
  // (`15m`, `1h`). Short by design: it is revoked by expiring, never by a
  // lookup — what gets revoked actively is the refresh token.
  //
  // The shape is checked here rather than trusted at signing time: `ms` throws
  // on a string it cannot read, and that would surface as a 500 on the first
  // login instead of a refusal to boot.
  JWT_EXPIRATION_TIME: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)?$/, 'expected a duration such as 15m, 1h or 900')
    .default('15m'),
  REFRESH_TOKEN_EXPIRATION_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Fails fast on a bad environment, before the app wires anything up.
 *
 * The error names the offending variables but never echoes their values:
 * DATABASE_URL carries a password, and a crash log is the last place it should
 * appear (DIRETRIZES_FLUXO_IA §9).
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration — ${problems}`);
  }

  return result.data;
}
