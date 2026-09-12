// Runs before every suite (`setupFiles`), so booting the AppModule never
// depends on the developer's `.env` — which the tests deliberately ignore
// (`ignoreEnvFile` when NODE_ENV=test).
//
// `JWT_SECRET` is required and has no default on purpose (SECURITY §Gestão de
// segredos), so the suites have to supply one. Setting it here rather than in
// each `beforeAll` means a new suite cannot forget it and fail with an
// environment error that looks like a bug in the feature under test.
//
// The value is a throwaway that only ever signs tokens for an ephemeral
// container: it is not a secret, and it is not the one used anywhere else.
process.env.JWT_SECRET ??= 'test-only-signing-key-not-a-secret-32+';
