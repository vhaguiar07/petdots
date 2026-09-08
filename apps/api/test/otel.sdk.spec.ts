import type { IncomingMessage } from 'node:http';

import { shouldIgnoreRequest, signalUrl, UNTRACED_PATH_PREFIXES } from '../src/otel/otel.sdk';

/**
 * Covers the two decisions inside the SDK builder that are ours rather than
 * OpenTelemetry's, and that fail quietly when wrong.
 *
 * What is deliberately NOT covered here: that a real request produces a real
 * span. Instrumentations patch modules through a `require` hook and Jest
 * replaces Node's module system with its own registry, so the patch never
 * lands under Jest — measured on 08/09/2026: `require('http').createServer`
 * comes back unwrapped inside a spec. That claim is proved by the manual script
 * against the local collector, and the automated version is registered in the
 * backlog.
 */
const asRequest = (url: string): IncomingMessage => ({ url }) as IncomingMessage;

describe('signalUrl', () => {
  /**
   * The `/v1/<signal>` suffix is only automatic when the SDK reads
   * `OTEL_EXPORTER_OTLP_ENDPOINT` itself. Passing `url` explicitly makes it
   * ours to append — and getting it wrong means a 404 per export and no
   * telemetry, with nothing in the API log to say so.
   */
  it('appends the signal path to a bare endpoint', () => {
    expect(signalUrl('http://localhost:4318', 'traces')).toBe('http://localhost:4318/v1/traces');
    expect(signalUrl('http://localhost:4318', 'metrics')).toBe('http://localhost:4318/v1/metrics');
  });

  it('does not double the slash on a trailing-slash endpoint', () => {
    expect(signalUrl('http://localhost:4318/', 'traces')).toBe('http://localhost:4318/v1/traces');
    expect(signalUrl('http://localhost:4318///', 'traces')).toBe('http://localhost:4318/v1/traces');
  });

  it('keeps a path-prefixed endpoint intact', () => {
    expect(signalUrl('https://otlp.vendor.io/otlp', 'traces')).toBe(
      'https://otlp.vendor.io/otlp/v1/traces',
    );
  });
});

describe('shouldIgnoreRequest', () => {
  it('ignores the Swagger paths', () => {
    expect(shouldIgnoreRequest(asRequest('/api/docs'))).toBe(true);
    expect(shouldIgnoreRequest(asRequest('/api/docs/swagger-ui.css'))).toBe(true);
  });

  /**
   * Health stays traced on purpose: it is the only real route today, so it is
   * the only thing the manual script can point at. It becomes noise — and gets
   * excluded — once something probes it on a schedule (in the backlog).
   */
  it('keeps health and business paths traced', () => {
    expect(shouldIgnoreRequest(asRequest('/api/v1/health'))).toBe(false);
    expect(shouldIgnoreRequest(asRequest('/api/v1/stores'))).toBe(false);
  });

  it('survives a request with no url', () => {
    expect(shouldIgnoreRequest({} as IncomingMessage)).toBe(false);
  });

  it('exposes the ignore list so the rule is reviewable', () => {
    expect(UNTRACED_PATH_PREFIXES).toEqual(['/api/docs']);
  });
});
