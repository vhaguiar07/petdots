import { readFileSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { OpenAPIObject } from '@nestjs/swagger';

import { API_PREFIX, buildOpenApiDocument, OPENAPI_SNAPSHOT_PATH } from '../src/openapi';

/**
 * Guards the published contract against drift (API_GUIDELINES, TESTING_STRATEGY).
 * A deliberate contract change regenerates the snapshot with
 * `npm run contract:write`; an accidental one fails here.
 */
describe('OpenAPI contract', () => {
  let app: INestApplication;
  let generated: OpenAPIObject;

  beforeAll(async () => {
    // No database is touched: the document comes from the route table alone.
    process.env.DATABASE_URL = 'postgresql://contract:contract@localhost:1/contract';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Deferred for the same reason as the e2e suite: `ConfigModule.forRoot()`
    // validates the environment as the module file is evaluated.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    generated = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('matches the published snapshot', () => {
    const published = JSON.parse(readFileSync(OPENAPI_SNAPSHOT_PATH, 'utf8')) as OpenAPIObject;

    expect(withoutVersion(generated)).toEqual(withoutVersion(published));
  });
});

/** `info.version` moves with releases, not with the contract. */
function withoutVersion(document: OpenAPIObject): Omit<OpenAPIObject, 'info'> & {
  info: Omit<OpenAPIObject['info'], 'version'>;
} {
  const { version: _version, ...info } = document.info;

  return { ...document, info };
}
