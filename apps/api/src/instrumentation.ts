import { ROOT_ENV_FILE } from './config/paths';
import { describeOtelConfig, resolveOtelConfig } from './otel/otel.config';
import { createOtelSdk } from './otel/otel.sdk';

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
 * Imported for its side effect as the very first line of `main.ts`: the
 * instrumentations patch modules through a `require` hook, so anything loaded
 * before this runs is never traced.
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
