import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Sentinel for the one OpenTelemetry failure that does not announce itself.
 *
 * Under ESM the instrumentations patch modules through a loader hook, and the
 * hook only takes effect if it is registered before the instrumented modules
 * are *loaded* — which is why the process starts as
 * `node --import ./dist/instrumentation.js dist/main.js`.
 *
 * Get that wrong and nothing raises: the app boots, the health route answers,
 * the boot line still says "exporting to …", and the exporter ships spans that
 * simply do not exist. Every other test in this suite would stay green. This
 * one boots the real compiled app against a fake OTLP collector and asserts a
 * span for a real request actually arrives.
 *
 * Runs against `dist/`, not `src/`: the loader-hook ordering is a property of
 * the built process, and it is the built process that CI and production run.
 * `turbo.json` makes `test` depend on `build` so the bundle is always there.
 */

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(currentDir, '..');
const distMain = path.join(apiRoot, 'dist', 'main.js');
// `--import` needs a file:// URL, not a bare path: on Windows an absolute path
// starts with a drive letter and Node rejects it as an unsupported URL scheme.
const distInstrumentation = pathToFileURL(path.join(apiRoot, 'dist', 'instrumentation.js')).href;

const SERVICE_NAME = 'petdots-api-esm-sentinel';
const HEALTH_PATH = '/api/v1/health';

/** Collected OTLP trace payloads, as received by the fake collector. */
type Collector = {
  server: Server;
  port: number;
  traceBodies: string[];
};

async function startCollector(): Promise<Collector> {
  const traceBodies: string[] = [];

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      if (request.url?.endsWith('/v1/traces')) {
        traceBodies.push(Buffer.concat(chunks).toString('utf8'));
      }

      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  return { server, port: (server.address() as AddressInfo).port, traceBodies };
}

/**
 * Asks the OS for a free port instead of guessing one. A guessed port makes
 * this suite fail intermittently when it collides with another test — or with
 * whatever else the developer happens to be running.
 */
async function freePort(): Promise<number> {
  const probe = createServer();

  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));

  const { port } = probe.address() as AddressInfo;

  await new Promise<void>((resolve) => probe.close(() => resolve()));

  return port;
}

/** Mirrors everything the child prints into `log`, for assertions and errors. */
function captureOutput(child: ChildProcessWithoutNullStreams, log: string[]): void {
  const onChunk = (chunk: Buffer): void => void log.push(chunk.toString('utf8'));

  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);
}

/**
 * Waits for the app to answer on its port. The boot log is deliberately not the
 * signal: the child runs with `LOG_LEVEL=silent`, and coupling the sentinel to
 * a log line would make it fail for reasons that have nothing to do with spans.
 */
async function waitForPort(url: string, log: string[]): Promise<void> {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      await fetch(url);

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`the app never answered on ${url}. Output:\n${log.join('')}`);
}

/** Instrumentation scopes and span names present in the exported payloads. */
function summarise(bodies: string[]): { scopes: string[]; spanNames: string[] } {
  const scopes = new Set<string>();
  const spanNames = new Set<string>();

  for (const body of bodies) {
    const payload = JSON.parse(body) as {
      resourceSpans?: {
        scopeSpans?: { scope?: { name?: string }; spans?: { name: string }[] }[];
      }[];
    };

    for (const resourceSpan of payload.resourceSpans ?? []) {
      for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
        if (scopeSpan.scope?.name) {
          scopes.add(scopeSpan.scope.name);
        }

        for (const span of scopeSpan.spans ?? []) {
          spanNames.add(span.name);
        }
      }
    }
  }

  return { scopes: [...scopes], spanNames: [...spanNames] };
}

describe('OpenTelemetry under ESM (sentinel)', () => {
  let collector: Collector;
  let child: ChildProcessWithoutNullStreams;
  const log: string[] = [];

  afterAll(async () => {
    child?.kill();
    await new Promise<void>((resolve) => collector?.server.close(() => resolve()));
  });

  it('exports a span for a real request through the loader hook', async () => {
    collector = await startCollector();

    const appPort = await freePort();

    child = spawn(process.execPath, ['--import', distInstrumentation, distMain], {
      cwd: apiRoot,
      env: {
        ...process.env,
        // Not `test`: that is the value `resolveOtelConfig` uses to switch the
        // SDK off, which would make this sentinel assert nothing.
        NODE_ENV: 'production',
        PORT: String(appPort),
        OTEL_SERVICE_NAME: SERVICE_NAME,
        OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${collector.port}`,
        // No database on purpose: health answers 503 and still produces the
        // HTTP span this test is about, so the sentinel needs no container.
        DATABASE_URL: 'postgresql://sentinel:sentinel@127.0.0.1:1/sentinel',
        LOG_LEVEL: 'silent',
      },
    });

    captureOutput(child, log);

    const healthUrl = `http://127.0.0.1:${appPort}${HEALTH_PATH}`;

    await waitForPort(healthUrl, log);

    // Proves the SDK is on at all: without this the assertion below could fail
    // for a boring configuration reason and read like a broken loader hook.
    expect(log.join('')).toContain(`exporting to http://127.0.0.1:${collector.port}`);

    await fetch(healthUrl).catch(() => undefined);

    // The batch processor exports on its own schedule (5s by default). SIGTERM
    // is not used to force the flush because Windows terminates the process
    // without running the handler.
    const deadline = Date.now() + 45_000;

    while (Date.now() < deadline && collector.traceBodies.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(collector.traceBodies.length).toBeGreaterThan(0);

    const { scopes, spanNames } = summarise(collector.traceBodies);

    /*
     * These two assertions are the whole point, and they were chosen by
     * measurement on 08/09/2026 — booting the same bundle with and without the
     * `register()` call and diffing what arrived:
     *
     *   without the hook: scopes = http, prisma          · span = "GET"
     *   with the hook:    scopes = http, prisma, express · span = "GET /api/v1/health"
     *
     * So `node:http` is patched either way (it is a builtin, and ESM shares the
     * builtin's module object with CJS). What the hook actually buys is the
     * express instrumentation — and with it the route name on the HTTP span.
     * Asserting merely that the payload mentions the path would pass in both
     * cases: the path shows up as a span attribute regardless.
     */
    expect(scopes).toContain('@opentelemetry/instrumentation-express');
    expect(spanNames).toContain(`GET ${HEALTH_PATH}`);
  }, 120_000);
});
