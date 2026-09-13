// 🔴 Runs the Expo dev server so that **Ctrl+C actually kills it**.
//
// The problem this exists to solve, measured on Windows in 13/09/2026: with a
// plain `"dev": "expo start"`, `npm run dev` builds this chain —
//
//   powershell → node (npm) → cmd.exe /d /s /c expo start → node (@expo/cli)
//
// — and Windows has no POSIX signals. Ctrl+C raises a `CTRL_C_EVENT` for the
// **console process group**, and the `cmd.exe /d /s /c` that npm always
// inserts to run a script is the link that breaks: it swallows the event (or
// stops to ask "Terminate batch job (Y/N)?") and frequently dies without
// passing anything to its own grandchild. The Expo process is left orphaned,
// still holding port 8081, with Metro's file watcher keeping the event loop
// alive — a server that answers nothing and blocks the next `expo start`.
//
// Two things fix it, and both are here:
//
//   1. **No shell.** `@expo/cli` resolves to a plain JS file, so it is spawned
//      as a direct child of this process with `process.execPath`. There is no
//      `cmd.exe` left in the middle to eat the signal, and the child shares
//      this console — so Ctrl+C reaches it directly, as it would on Linux.
//   2. **A tree kill as the backstop.** Even reached, Metro can hang on the way
//      out (its watcher holds handles, and a corrupt cache makes it worse). So
//      the handler asks politely, waits, and then takes the whole tree down —
//      on Windows with `taskkill /T`, because `child.kill()` there does not
//      touch grandchildren.
//
// The same wrapper shape as `apps/api/scripts/dev.mjs` and `scripts/jest.mjs`:
// a file instead of an inline command, so the behaviour is identical on Windows
// and on the CI runner.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * `@expo/cli` is what `expo/bin/cli` itself requires, and unlike `expo/bin/cli`
 * it is reachable through the package's `exports` map — so this resolves
 * without guessing at a path inside `node_modules`.
 */
const cli = require.resolve('@expo/cli');

/** How long Metro gets to close on its own before the tree is taken down. */
const GRACE_MS = 3_000;

const child = spawn(process.execPath, [cli, 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

let shuttingDown = false;

/**
 * Kills the child **and everything it spawned**.
 *
 * On Windows `child.kill()` signals only the process itself, which leaves
 * Metro's workers behind holding the port — the exact failure this file exists
 * to prevent. `taskkill /T` walks the tree.
 */
function killTree() {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGKILL');
}

function shutdown() {
  // A second Ctrl+C means "I am not waiting": skip the grace period.
  if (shuttingDown) {
    killTree();
    process.exit(130);
  }

  shuttingDown = true;

  // The child already received the console's Ctrl+C on Windows, and gets this
  // on every other platform. Either way it now has `GRACE_MS` to finish.
  child.kill('SIGINT');

  const timer = setTimeout(() => {
    console.error('\nexpo did not exit on its own; taking the process tree down');
    killTree();
    process.exit(130);
  }, GRACE_MS);

  // Never let the timer be the reason this process stays alive.
  timer.unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 🔴 The last line of defence: whatever ends this process — a clean exit, an
// uncaught error, `process.exit` from above — the child must not outlive it.
process.on('exit', killTree);

child.on('exit', (code, signal) => {
  process.exit(signal ? 130 : (code ?? 0));
});
