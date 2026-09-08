import { z } from 'zod';

/**
 * Why this lives apart from `config/env.schema.ts`: the SDK has to be running
 * before Nest exists, and `ConfigModule.forRoot({ validate })` only runs while
 * the AppModule is being evaluated — far too late to patch `require`. So the
 * OTel slice of the environment is parsed here, and here only.
 */
const otelEnvSchema = z.object({
  // The protocol has to be pinned: a bare `z.url()` accepts `htp:/host:4318`
  // as a valid URL (any scheme parses), which would build an exporter that
  // points nowhere and export nothing — the exact silent failure this module
  // exists to prevent. Caught by `otel.config.spec.ts`.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().min(1).default('petdots-api'),
  OTEL_SDK_DISABLED: z.enum(['true', 'false']).default('false'),
  NODE_ENV: z.string().optional(),
});

export type OtelDisabledReason = 'test-env' | 'sdk-disabled' | 'no-endpoint' | 'invalid-config';

export type OtelConfig =
  | {
      enabled: true;
      endpoint: string;
      headers: Record<string, string>;
      serviceName: string;
      environment: string;
    }
  | { enabled: false; reason: OtelDisabledReason; detail?: string };

/**
 * Parses `OTEL_EXPORTER_OTLP_HEADERS` in the format the OTel spec defines:
 * `key1=value1,key2=value2`. A malformed pair is dropped rather than throwing —
 * a bad header should not be the difference between booting and not booting.
 */
function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) {
    return {};
  }

  return raw.split(',').reduce<Record<string, string>>((headers, pair) => {
    const separator = pair.indexOf('=');

    if (separator > 0) {
      const key = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();

      if (key && value) {
        headers[key] = value;
      }
    }

    return headers;
  }, {});
}

/**
 * Decides whether telemetry runs, and says why when it does not.
 *
 * Misconfigured telemetry fails silently by nature — nothing breaks, the data
 * simply never arrives. That is why every negative answer carries a `reason`:
 * the caller logs it at boot, so "no traces" is always traceable to a cause
 * instead of being a mystery.
 *
 * `detail` names the offending variables on invalid input and **never echoes
 * their values** — `OTEL_EXPORTER_OTLP_HEADERS` carries an API key
 * (DIRETRIZES_FLUXO_IA §9).
 */
export function resolveOtelConfig(env: Record<string, unknown>): OtelConfig {
  const parsed = otelEnvSchema.safeParse(env);

  if (!parsed.success) {
    const variables = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];

    return {
      enabled: false,
      reason: 'invalid-config',
      detail: variables.join(', '),
    };
  }

  const config = parsed.data;

  // Tests get a deterministic, offline process: no exporter, no batching
  // timers, no span noise in the existing suite.
  if (config.NODE_ENV === 'test') {
    return { enabled: false, reason: 'test-env' };
  }

  if (config.OTEL_SDK_DISABLED === 'true') {
    return { enabled: false, reason: 'sdk-disabled' };
  }

  if (!config.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return { enabled: false, reason: 'no-endpoint' };
  }

  return {
    enabled: true,
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: parseHeaders(config.OTEL_EXPORTER_OTLP_HEADERS),
    serviceName: config.OTEL_SERVICE_NAME,
    environment: config.NODE_ENV ?? 'development',
  };
}

/** Boot line for each outcome. Always logged — silence is the failure mode. */
export function describeOtelConfig(config: OtelConfig): string {
  if (config.enabled) {
    return `OpenTelemetry: exporting to ${config.endpoint} as "${config.serviceName}" (${config.environment})`;
  }

  const explanations: Record<OtelDisabledReason, string> = {
    'test-env': 'NODE_ENV=test',
    'sdk-disabled': 'OTEL_SDK_DISABLED=true',
    'no-endpoint': 'OTEL_EXPORTER_OTLP_ENDPOINT is not set',
    'invalid-config': `invalid configuration in ${config.detail ?? 'unknown variables'}`,
  };

  return `OpenTelemetry: disabled — ${explanations[config.reason]}`;
}
