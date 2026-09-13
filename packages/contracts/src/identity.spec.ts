import {
  authenticatedUserSchema,
  authTokensSchema,
  loginRequestSchema,
  registerRequestSchema,
} from './identity.js';

const VALID_REGISTRATION = {
  email: 'Victor@PetDots.com.br',
  password: 'petdots-dev-2026',
};

/** The field each rejection must point at, so the client can place the error. */
const fieldOf = (schema: { safeParse: (value: unknown) => unknown }, body: unknown): string[] => {
  const result = schema.safeParse(body) as
    { success: true } | { success: false; error: { issues: { path: (string | number)[] }[] } };

  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('registerRequestSchema', () => {
  it('accepts an e-mail and a long enough password', () => {
    expect(registerRequestSchema.safeParse(VALID_REGISTRATION).success).toBe(true);
  });

  it('rejects an address with no domain', () => {
    expect(fieldOf(registerRequestSchema, { ...VALID_REGISTRATION, email: 'victor' })).toEqual([
      'email',
    ]);
  });

  it('rejects a password below the policy', () => {
    expect(fieldOf(registerRequestSchema, { ...VALID_REGISTRATION, password: 'curta' })).toEqual([
      'password',
    ]);
  });

  it('keeps input and output identical, so the OpenAPI types match', () => {
    // No `.transform()` in the contract (pd-09, A11): the use case normalises
    // the e-mail, the border only validates it.
    expect(registerRequestSchema.parse(VALID_REGISTRATION)).toEqual(VALID_REGISTRATION);
  });
});

describe('loginRequestSchema', () => {
  it('accepts any non-empty password', () => {
    // 🔴 The registration policy is NOT applied at login. Refusing a short
    // guess with a 422 that names the field would answer differently depending
    // on the shape of the guess; every wrong credential owes one identical 401.
    expect(
      loginRequestSchema.safeParse({ email: 'victor@petdots.com.br', password: 'x' }).success,
    ).toBe(true);
  });

  it('accepts an e-mail the registration schema would refuse', () => {
    // Same reason: the border must not classify the attempt before the
    // credentials are checked.
    expect(
      loginRequestSchema.safeParse({ email: 'nao-e-email', password: 'qualquer' }).success,
    ).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(fieldOf(loginRequestSchema, { email: 'victor@petdots.com.br', password: '' })).toEqual([
      'password',
    ]);
  });
});

describe('authenticatedUserSchema', () => {
  it('accepts an identity that accumulates roles', () => {
    const parsed = authenticatedUserSchema.parse({
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'victor@petdots.com.br',
      phone: null,
      roles: ['TUTOR', 'STORE_MEMBER'],
    });

    expect(parsed.roles).toEqual(['TUTOR', 'STORE_MEMBER']);
  });

  it('rejects an identity with no role at all', () => {
    // Mirrors `users_roles_not_empty_check`: an empty set never intersects, so
    // the row would authenticate and be denied everywhere.
    expect(
      authenticatedUserSchema.safeParse({
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        email: 'victor@petdots.com.br',
        phone: null,
        roles: [],
      }).success,
    ).toBe(false);
  });

  it('🔴 strips passwordHash instead of carrying it', () => {
    // The sentinel of the whole module at the contract layer: the schema is the
    // shape every auth response is built from, so an extra key must not survive
    // it. The e2e sweep (C6) is the second lock, on the real bodies.
    const parsed = authenticatedUserSchema.parse({
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      email: 'victor@petdots.com.br',
      phone: null,
      roles: ['TUTOR'],
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA',
    });

    expect(parsed).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(parsed)).not.toContain('$argon2');
  });
});

describe('authTokensSchema', () => {
  it('describes the pair and the identity it belongs to', () => {
    const parsed = authTokensSchema.parse({
      accessToken: 'header.payload.signature',
      refreshToken: 'opaque-token',
      expiresIn: 900,
      user: {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        email: 'victor@petdots.com.br',
        phone: '+5521999990001',
        roles: ['TUTOR'],
      },
    });

    expect(parsed.expiresIn).toBe(900);
  });

  it('rejects a non-positive lifetime', () => {
    expect(
      authTokensSchema.safeParse({
        accessToken: 'a',
        refreshToken: 'b',
        expiresIn: 0,
        user: {
          id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
          email: 'victor@petdots.com.br',
          phone: null,
          roles: ['TUTOR'],
        },
      }).success,
    ).toBe(false);
  });
});
