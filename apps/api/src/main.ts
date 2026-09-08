// MUST stay the first import: the OpenTelemetry instrumentations patch modules
// through a `require` hook, so anything imported above this line is never
// traced. This ordering is functional, not stylistic — "organize imports" would
// sort `./app.module` to the top and silently kill telemetry.
import './instrumentation';

import { writeFileSync } from 'node:fs';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { API_PREFIX, buildOpenApiDocument, DOCS_PATH, OPENAPI_SNAPSHOT_PATH } from './openapi';

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
