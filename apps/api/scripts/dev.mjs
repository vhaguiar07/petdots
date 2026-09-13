// Sobe a API em modo watch.
//
// `nest start --watch` compila para `dist/` e então roda `node dist/main`, então
// o loader do OpenTelemetry precisa alcançar esse processo neto. `NODE_OPTIONS`
// é a única costura que o CLI do Nest deixa para isso.
//
// 🔴 **A mecânica de encerramento está em `scripts/dev-runner.mjs`**, na raiz, e
// foi trazida para cá em 13/09/2026. Até então este arquivo usava
// `spawnSync(..., { shell: true })`, que era o pior caso possível no Windows:
// acrescentava **mais um** `cmd.exe` à cadeia, não tratava sinal nenhum e não
// tinha como derrubar a árvore — e `nest start --watch` cria um neto
// (`node dist/main`) que `child.kill()` não alcança. O sintoma era o mesmo do
// app: a porta 3001 presa depois do Ctrl+C.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { runDev } from '../../../scripts/dev-runner.mjs';

const require = createRequire(import.meta.url);

/**
 * O JS do CLI do Nest, e não o binário `nest` do `.bin`: é o que permite
 * lançá-lo como filho direto de `node`, sem shell — mesma razão do wrapper do
 * app.
 */
const cli = require.resolve('@nestjs/cli/bin/nest.js');

/** O diretório da API, para a invocação não depender de onde partiu. */
const apiRoot = fileURLToPath(new URL('..', import.meta.url));

const IMPORT_FLAG = '--import ./dist/instrumentation.js';

runDev({
  argv: [cli, 'start', '--watch'],
  cwd: apiRoot,
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} ${IMPORT_FLAG}`.trim(),
  },
});
