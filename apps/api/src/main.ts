// Telemetry is deliberately NOT imported here. Under ESM the loader hook has to
// be installed before this module's own graph is loaded, which an import from
// inside it cannot do — see the comment at the top of `./instrumentation.ts`.
// The process is started as `node --import ./dist/instrumentation.js
// dist/main.js`; the npm scripts and the CI smoke step already do that.
import { writeFileSync } from 'node:fs';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.schema.js';
import { API_PREFIX, buildOpenApiDocument, DOCS_PATH, OPENAPI_SNAPSHOT_PATH } from './openapi.js';

async function bootstrap(): Promise<void> {
  // Typed as the Express application, not the platform-agnostic one, for the
  // single call below: `trust proxy` is an Express setting and there is no
  // adapter-neutral way to reach it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX);

  const document = buildOpenApiDocument(app);

  // Doubles as the contract generator: `npm run contract:write` boots the app
  // only to publish the snapshot, then exits.
  if (process.env.WRITE_OPENAPI === '1') {
    writeFileSync(OPENAPI_SNAPSHOT_PATH, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await app.close();
    return;
  }

  SwaggerModule.setup(DOCS_PATH, app, document);

  const config = app.get(ConfigService<Env, true>);

  // 🔴 How many proxies to believe, as a COUNT — never `true`.
  //
  // `trust proxy: true` tells Express to accept the left-most entry of
  // `X-Forwarded-For`, which any caller can write: whoever wants a fresh rate
  // limit budget sends a new one per request. A count says instead "the last N
  // hops are ours", and Express walks the header from the right, past exactly
  // that many, to find the address our own edge observed. Forging entries then
  // only prepends noise to the left of the real one.
  //
  // Zero disables it, which is right locally and anywhere the process is
  // reached directly — and is the default, so a forgotten variable under-trusts
  // rather than over-trusts (`env.schema.ts`).
  const trustProxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });

  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  // The universal client runs on its own dev origin (Expo serves the web build
  // on :8081), so the browser blocks every call to the API unless the origins
  // are named. Off unless CORS_ORIGINS is set — see `.env.example`.
  const corsOrigins = (config.get('CORS_ORIGINS', { infer: true }) ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins });
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
