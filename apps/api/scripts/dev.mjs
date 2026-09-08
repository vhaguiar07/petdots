// `nest start --watch` compiles to dist/ and then runs `node dist/main`, so the
// OpenTelemetry loader hook has to reach that child process. NODE_OPTIONS is
// the only seam the Nest CLI leaves for it.
//
// A wrapper instead of an inline env var keeps the command identical on Windows
// and on the CI runner — same reason `write-openapi.js` exists.
import { spawnSync } from 'node:child_process';

const IMPORT_FLAG = '--import ./dist/instrumentation.js';

const result = spawnSync('nest', ['start', '--watch'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} ${IMPORT_FLAG}`.trim(),
  },
});

process.exit(result.status ?? 1);
