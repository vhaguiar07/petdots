import { register } from 'node:module';

/**
 * ESM has no `require` hook for the instrumentations to patch through, so the
 * loader hook has to be installed before any instrumented module is *loaded* —
 * not merely before it runs.
 *
 * Two consequences, both load-bearing:
 *
 * 1. This file must be brought in with `node --import`, never imported from
 *    `main.ts`. Node links an entire ESM graph before evaluating any of it, so
 *    an import from `main.ts` would run after `@nestjs/*`, `express` and
 *    `node:http` were already loaded — too late to patch them.
 * 2. Everything below is loaded with `await import(...)`, not a static import.
 *    Static imports of this module are evaluated *before* its body, which would
 *    put the OTel packages (and the `node:http` they pull in) on the wrong side
 *    of `register()`.
 *
 * Getting either wrong does not raise: the instrumentations simply patch
 * nothing and the process exports empty traces, which is indistinguishable from
 * "no traffic yet". `test/instrumentation.esm.e2e-spec.ts` is the sentinel.
 */
register('import-in-the-middle/hook.mjs', import.meta.url);

const { ROOT_ENV_FILE } = await import('./config/paths.js');
const { describeOtelConfig, resolveOtelConfig } = await import('./otel/otel.config.js');
const { createOtelSdk } = await import('./otel/otel.sdk.js');

/**
 * The SDK has to read its configuration before Nest exists, and `@nestjs/config`
 * only copies `.env` into `process.env` when `ConfigModule.forRoot()` runs —
 * which is later. Without this, `OTEL_EXPORTER_OTLP_ENDPOINT` in `.env` would be
 * invisible here and telemetry would stay silently off, which is exactly the
 * failure this module is built to avoid.
 *
 * Skipped under `NODE_ENV=test` for the same reason `ConfigModule` sets
 * `ignoreEnvFile` there: tests get their environment injected and must not
 * inherit the developer's `.env`.
 */
if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile(ROOT_ENV_FILE);
  } catch {
    // No .env on disk is a legitimate setup (CI, container with real env vars).
  }
}

/**
 * Starts OpenTelemetry, or explains why it did not.
 *
 * The boot line is not decoration. Broken telemetry configuration does not
 * crash anything — it just produces silence, which is indistinguishable from
 * "no traffic yet". Printing the outcome every time is what makes the failure
 * findable. `console` is used on purpose: Nest, and therefore the pino logger,
 * does not exist at this point in the process.
 */
const config = resolveOtelConfig(process.env);

console.log(describeOtelConfig(config));

if (config.enabled) {
  const sdk = createOtelSdk(config);

  sdk.start();

  // Spans and metrics sit in a buffer until the next export tick; without a
  // flush on the way out, whatever happened in the last seconds of the process
  // — often the interesting part — dies with it.
  const shutdown = (signal: string): void => {
    void sdk.shutdown().finally(() => {
      console.log(`OpenTelemetry: flushed and stopped on ${signal}`);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
