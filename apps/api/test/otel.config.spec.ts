import { describeOtelConfig, resolveOtelConfig } from '../src/otel/otel.config';

const ENDPOINT = 'http://localhost:4318';

describe('resolveOtelConfig', () => {
  it('enables the SDK with a valid endpoint', () => {
    const config = resolveOtelConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT });

    expect(config).toMatchObject({
      enabled: true,
      endpoint: ENDPOINT,
      serviceName: 'petdots-api',
      environment: 'development',
    });
  });

  it('parses OTLP headers into a map', () => {
    const config = resolveOtelConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
      OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Bearer abc123,X-Tenant=petdots',
    });

    expect(config.enabled && config.headers).toEqual({
      Authorization: 'Bearer abc123',
      'X-Tenant': 'petdots',
    });
  });

  it('keeps a header value that contains "="', () => {
    const config = resolveOtelConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
      OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Basic dXNlcjpwYXNz==',
    });

    expect(config.enabled && config.headers).toEqual({ Authorization: 'Basic dXNlcjpwYXNz==' });
  });

  it('stays off in tests, whatever else is configured', () => {
    const config = resolveOtelConfig({
      NODE_ENV: 'test',
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
    });

    expect(config).toEqual({ enabled: false, reason: 'test-env' });
  });

  it('honours OTEL_SDK_DISABLED over a configured endpoint', () => {
    const config = resolveOtelConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
      OTEL_SDK_DISABLED: 'true',
    });

    expect(config).toEqual({ enabled: false, reason: 'sdk-disabled' });
  });

  it('stays off when no endpoint is configured', () => {
    expect(resolveOtelConfig({})).toEqual({ enabled: false, reason: 'no-endpoint' });
  });

  /**
   * The reason this whole module exists: a typo must be loud. Silence is
   * indistinguishable from "no traffic yet", and that is how broken telemetry
   * survives for weeks.
   */
  it('rejects a malformed endpoint instead of falling back to silence', () => {
    const config = resolveOtelConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: 'htp:/localhost:4318' });

    expect(config).toMatchObject({ enabled: false, reason: 'invalid-config' });
    expect(config.enabled === false && config.detail).toContain('OTEL_EXPORTER_OTLP_ENDPOINT');
  });

  it('rejects an unknown OTEL_SDK_DISABLED value', () => {
    const config = resolveOtelConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
      OTEL_SDK_DISABLED: 'yes',
    });

    expect(config).toMatchObject({ enabled: false, reason: 'invalid-config' });
  });
});

describe('describeOtelConfig', () => {
  it('names the endpoint when enabled', () => {
    const line = describeOtelConfig(resolveOtelConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT }));

    expect(line).toContain(ENDPOINT);
    expect(line).toContain('petdots-api');
  });

  it.each([
    [{ NODE_ENV: 'test' }, 'NODE_ENV=test'],
    [{ OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT, OTEL_SDK_DISABLED: 'true' }, 'OTEL_SDK_DISABLED'],
    [{}, 'OTEL_EXPORTER_OTLP_ENDPOINT is not set'],
  ])('explains why it is off: %j', (env, expected) => {
    expect(describeOtelConfig(resolveOtelConfig(env))).toContain(expected);
  });

  /**
   * `OTEL_EXPORTER_OTLP_HEADERS` carries an API key. The boot line names the
   * offending variable and never its value (DIRETRIZES_FLUXO_IA §9).
   */
  it('never echoes a configured value', () => {
    const secret = 'super-secret-key';
    const line = describeOtelConfig(
      resolveOtelConfig({
        OTEL_EXPORTER_OTLP_ENDPOINT: 'not-a-url',
        OTEL_EXPORTER_OTLP_HEADERS: `Authorization=Bearer ${secret}`,
      }),
    );

    expect(line).not.toContain(secret);
    expect(line).toContain('OTEL_EXPORTER_OTLP_ENDPOINT');
  });
});
