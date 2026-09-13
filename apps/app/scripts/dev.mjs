// Sobe o servidor de desenvolvimento do Expo.
//
// Toda a mecânica de "Ctrl+C realmente mata" está em `scripts/dev-runner.mjs`,
// na raiz — inclusive o porquê de ela ser necessária no Windows. Este arquivo
// só decide **o que** rodar e **onde**.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { runDev } from '../../../scripts/dev-runner.mjs';

const require = createRequire(import.meta.url);

/**
 * `@expo/cli` é o que o próprio `expo/bin/cli` exige e, ao contrário dele, é
 * alcançável pelo mapa de `exports` do pacote — então isto resolve sem chutar
 * um caminho dentro de `node_modules`.
 *
 * Resolver o arquivo JS em vez de chamar o binário `expo` é o que permite
 * lançá-lo como filho direto de `node`, sem um `cmd.exe` no meio.
 */
const cli = require.resolve('@expo/cli');

/**
 * 🔴 O diretório do próprio app, seja lá de onde isto tenha sido invocado.
 *
 * `npm run dev -w @petdots/app` já o define, mas rodar o arquivo à mão a partir
 * da raiz do repositório não — e o CLI do Expo **escreve um `tsconfig.json` no
 * diretório corrente** quando não encontra um lá. Foi assim que um
 * `tsconfig.json` solto estendendo `expo/tsconfig.base` entrou no repositório
 * uma vez (13/09/2026). Fixar o cwd torna o caminho de invocação irrelevante.
 */
const appRoot = fileURLToPath(new URL('..', import.meta.url));

runDev({
  argv: [cli, 'start', ...process.argv.slice(2)],
  cwd: appRoot,
});
