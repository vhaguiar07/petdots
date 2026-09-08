// Runs Jest with the flag its ESM support still requires (`vm.Module` is
// experimental in Node 24). A wrapper instead of an inline `NODE_OPTIONS=`
// keeps the command identical on Windows and on the CI runner — the same
// reason `apps/api/scripts/write-openapi.js` exists.
//
// The binary is invoked through the shim npm puts on PATH rather than a
// resolved file path: `jest/bin/jest.js` is not in the package's `exports` map,
// so `require.resolve` cannot reach it.
import { spawnSync } from 'node:child_process';

const result = spawnSync('jest', process.argv.slice(2), {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --experimental-vm-modules`.trim(),
  },
});

process.exit(result.status ?? 1);
