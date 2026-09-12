import { isAcceptablePassword, isEmail, MIN_PASSWORD_LENGTH } from '@petdots/domain';
import { z } from 'zod';

/**
 * The roles a `User` accumulates (DOMAIN_MODEL §Usuário). A list, not a single
 * value: the shop owner who also has a pet is one identity with two roles, and
 * every authorisation check is therefore an intersection (ADR-0011, R4).
 */
export const userRoleSchema = z.enum(['TUTOR', 'STORE_MEMBER', 'ADMIN']);

/**
 * The authenticated identity, as the API is willing to describe it.
 *
 * 🔴 `passwordHash` is absent and must stay absent. This schema is the shape
 * every auth response is built from, so what is not declared here cannot leak
 * by accident — a sentinel e2e sweeps the raw bodies for it anyway (C6).
 */
export const authenticatedUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  roles: z.array(userRoleSchema).min(1),
});

/**
 * Body of POST /api/v1/auth/register. Validation only — normalisation (trim,
 * lowercase) is the use case's job, as in the waitlist (pd-09, A11).
 *
 * The messages are in Portuguese on purpose: they travel to `details[].message`
 * of the ERROR_MODEL and the client shows them. Identifiers and comments stay
 * in English (NAMING_CONVENTIONS).
 */
export const registerRequestSchema = z.object({
  email: z
    .string()
    .max(255)
    .refine(isEmail, 'Informe um e-mail válido.')
    .describe('E-mail do usuário; normalizado para minúsculas.'),
  password: z
    .string()
    .refine(
      isAcceptablePassword,
      `A senha precisa ter ao menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`,
    )
    .describe(`Senha de ${String(MIN_PASSWORD_LENGTH)} caracteres ou mais.`),
});

/**
 * Body of POST /api/v1/auth/login.
 *
 * 🔴 The password is `z.string().min(1)` and **not** the registration policy.
 * Refusing a short password at login with a `422` that names the field would
 * tell an attacker their guess was too short before the credentials were even
 * checked, and would answer differently depending on the shape of the guess.
 * Every wrong credential must produce the one identical `401` (A/step 9).
 */
export const loginRequestSchema = z.object({
  email: z.string().max(255).describe('E-mail cadastrado.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Informe o refresh token.'),
});

/** Logout revokes one refresh token — the session being closed, not all of them. */
export const logoutRequestSchema = refreshRequestSchema;

export const authTokensSchema = z.object({
  accessToken: z.string().describe('JWT curto, enviado em Authorization: Bearer.'),
  refreshToken: z
    .string()
    .describe('Token longo e opaco. Rotacionado a cada uso: o anterior deixa de valer.'),
  expiresIn: z.int().positive().describe('Vida do access token, em segundos.'),
  user: authenticatedUserSchema,
});

export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
