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
