// Telemetry is deliberately NOT imported here. Under ESM the loader hook has to
// be installed before this module's own graph is loaded, which an import from
// inside it cannot do — see the comment at the top of `./instrumentation.ts`.
// The process is started as `node --import ./dist/instrumentation.js
// dist/main.js`; the npm scripts and the CI smoke step already do that.
import { writeFileSync } from 'node:fs';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.schema.js';
import { API_PREFIX, buildOpenApiDocument, DOCS_PATH, OPENAPI_SNAPSHOT_PATH } from './openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

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

  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
