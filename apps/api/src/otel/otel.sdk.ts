import type { IncomingMessage } from 'node:http';

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import type { OtelConfig } from './otel.config.js';

/**
 * Paths worth no trace. Swagger UI fires a burst of asset requests per page
 * load and none of it is a business path.
 *
 * `/api/v1/health` **joined the list in pd-19**, when its trigger fired. It was
 * kept traced on purpose while it was the only real route in the API — the one
 * target a span sentinel could point at — and the backlog recorded the
 * condition for excluding it as "an orchestrator probing it on a schedule".
 * Publishing produced two at once: Railway's own healthcheck and the uptime
 * probe of OBSERVABILITY. Left in, it would be the most traced path in the
 * product and the largest single line of a metered telemetry bill, describing
 * nothing anyone asked for. There are now dozens of real routes to verify the
 * instrumentation against.
 */
const UNTRACED_PATH_PREFIXES = ['/api/docs', '/api/v1/health'];

/**
 * The OTLP/HTTP exporters want the full signal URL, not the base endpoint —
 * the automatic `/v1/<signal>` suffix only happens when the SDK reads
 * `OTEL_EXPORTER_OTLP_ENDPOINT` itself. Since the endpoint is resolved and
 * validated by `resolveOtelConfig`, the suffix is ours to add: forgetting it
 * yields a 404 per export and no telemetry at all.
 */
function signalUrl(endpoint: string, signal: 'traces' | 'metrics'): string {
  return `${endpoint.replace(/\/+$/, '')}/v1/${signal}`;
}

function shouldIgnoreRequest(request: IncomingMessage): boolean {
  const path = request.url ?? '';

  return UNTRACED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Builds the SDK for an enabled configuration.
 *
 * Request bodies and headers are never captured: a span is not an audit trail,
 * and attributes are the easiest place to leak a token or personal data
 * (SECURITY, DIRETRIZES_FLUXO_IA §9). The defaults already omit them — this
 * comment exists so nobody turns them on without weighing that.
 */
export function createOtelSdk(config: Extract<OtelConfig, { enabled: true }>): NodeSDK {
  // Populated by npm for any `npm run` script; absent when the binary is
  // invoked directly, in which case the attribute is simply omitted.
  const version = process.env.npm_package_version;

  return new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
      ...(version ? { [ATTR_SERVICE_VERSION]: version } : {}),
    }),
    traceExporter: new OTLPTraceExporter({
      url: signalUrl(config.endpoint, 'traces'),
      headers: config.headers,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: signalUrl(config.endpoint, 'metrics'),
        headers: config.headers,
      }),
    }),
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: shouldIgnoreRequest }),
      new ExpressInstrumentation(),
      new PinoInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });
}

export { signalUrl, shouldIgnoreRequest, UNTRACED_PATH_PREFIXES };
