import path from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { REPO_ROOT } from './config/paths.js';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

/**
 * The published contract (API_GUIDELINES). Both the running app and the
 * contract test build the document from this one function, so the snapshot can
 * only drift when the routes really change.
 */
export const OPENAPI_SNAPSHOT_PATH = path.join(REPO_ROOT, 'packages', 'contracts', 'openapi.json');

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  // No `addServer`: the document is built after `setGlobalPrefix`, so every
  // path already carries `/api/v1` — a server entry would double the prefix.
  const config = new DocumentBuilder()
    .setTitle('PetDots API')
    .setDescription('Contrato canônico de fronteira do PetDots, gerado a partir dos schemas Zod.')
    .setVersion('1.0.0')
    .build();

  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
