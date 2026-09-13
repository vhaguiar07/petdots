// 🔴 Roda um servidor de desenvolvimento de modo que **Ctrl+C realmente o mate**
// no Windows.
//
// ## O que quebra, medido em 13/09/2026
//
// `npm run dev -w @petdots/app` monta esta cadeia, e a árvore foi observada
// viva com a porta 8081 presa depois de Ctrl+C:
//
//   powershell → npm (39508) → cmd.exe /d /s /c (4580) → node dev.mjs (25824)
//     → node @expo/cli (10460)  ← segurando a 8081
//
// 🔴 **O `cmd.exe` do meio é inserido pelo npm, e é ele que come o Ctrl+C.**
// A primeira tentativa de correção (pd-15) removeu o `cmd.exe` que ficava
// *abaixo* do wrapper, entre ele e o Expo — o que era necessário e não era
// suficiente: o que interrompe a entrega do `CTRL_C_EVENT` está *acima*, e
// `npm run` sempre o insere. Não há como pedir ao npm que não o insira.
//
// ## Por que sinal não resolve
//
// Windows não tem sinais POSIX. O Ctrl+C levanta um `CTRL_C_EVENT` para o
// *grupo de processos do console*, e nessa cadeia o evento pode: ser engolido
// pelo `cmd.exe`; virar o prompt "Terminate batch job (Y/N)?"; matar o npm e
// deixar filho e neto **órfãos** com a porta presa; ou simplesmente não chegar
// a ninguém. Depender de qualquer um desses caminhos é o que já falhou.
//
// ## Os três gatilhos deste arquivo, deliberadamente redundantes
//
//  1. **Ctrl+C lido do stdin como byte `0x03`** — não é sinal, é um byte. Não
//     depende de `cmd.exe`, de grupo de console nem da emulação de SIGINT do
//     Node. É o gatilho que funciona quando os outros dois não funcionam.
//  2. **SIGINT/SIGTERM**, para quando o sinal *chega* (Linux, CI, e o Windows
//     nos casos em que a entrega dá certo).
//  3. **Vigia do processo pai** — se o npm/`cmd.exe` morrer e nos deixar
//     órfãos, ninguém mais vai mandar sinal nenhum. É o caso clássico em que a
//     porta fica presa com o terminal já de volta ao prompt.
//
// E, como rede embaixo de tudo, `taskkill /T` derruba a **árvore**: no Windows
// `child.kill()` não toca nos netos, e é neto (worker do Metro, `node dist/main`
// do Nest) que costuma sobreviver.
//
// ⚠️ **Custo assumido:** para ler o `0x03` este processo precisa ser dono do
// stdin, então o filho recebe um *pipe* e não um TTY. Na prática isso desliga o
// **menu interativo do Expo** (`w` abre o navegador, `r` recarrega): o Expo só
// o habilita quando enxerga `process.stdin.isTTY`. As teclas continuam sendo
// encaminhadas — o que se perde é o menu se anunciar. Trocar o menu por "Ctrl+C
// funciona" foi a escolha; para reverter, passe `forwardStdin: false`.
import { spawn, spawnSync } from 'node:child_process';

/** Quanto tempo o filho tem para sair sozinho antes de a árvore ser derrubada. */
const GRACE_MS = 3_000;

/** De quanto em quanto tempo se confere se o pai ainda existe. */
const PARENT_POLL_MS = 1_000;

/** O byte que o terminal manda quando se aperta Ctrl+C. */
const ETX = 0x03;

/**
 * Sobe um servidor de desenvolvimento e garante que ele morra junto.
 *
 * @param {object} options
 * @param {string[]} options.argv Argumentos do `node` — normalmente `[cliJs, ...]`.
 * @param {string} options.cwd Diretório do app, fixado para não depender de onde foi chamado.
 * @param {Record<string, string | undefined>} [options.env]
 * @param {boolean} [options.forwardStdin] `false` devolve o TTY ao filho, ao custo do gatilho 1.
 */
export function runDev({ argv, cwd, env = process.env, forwardStdin = true }) {
  // Só dá para interceptar teclas se houver teclado: sob o CI, ou com a saída
  // redirecionada, `stdin` não é TTY e herdar é o comportamento certo.
  const interceptStdin = forwardStdin && Boolean(process.stdin.isTTY);

  const child = spawn(process.execPath, argv, {
    cwd,
    env,
    stdio: interceptStdin ? ['pipe', 'inherit', 'inherit'] : 'inherit',
  });

  let shuttingDown = false;

  /**
   * Mata o filho **e tudo que ele criou**.
   *
   * No Windows `child.kill()` sinaliza só o próprio processo, deixando para trás
   * os workers que seguram a porta — exatamente a falha que este arquivo existe
   * para impedir. `taskkill /T` percorre a árvore.
   */
  function killTree() {
    if (child.exitCode !== null || child.signalCode !== null) {
      return;
    }

    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    }

    // Fora do Windows o grupo inteiro morre junto.
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }

  function shutdown(reason) {
    // Um segundo Ctrl+C quer dizer "não estou esperando": pula a carência.
    if (shuttingDown) {
      killTree();
      process.exit(130);
      return;
    }

    shuttingDown = true;

    if (reason) {
      console.error(`\n${reason}`);
    }

    child.kill('SIGINT');

    const timer = setTimeout(() => {
      console.error('o servidor não saiu sozinho; derrubando a árvore de processos');
      killTree();
      process.exit(130);
    }, GRACE_MS);

    // O timer nunca pode ser o motivo de este processo continuar vivo.
    timer.unref();
  }

  // ---------------------------------------------------------------- gatilho 1
  if (interceptStdin) {
    // Modo bruto entrega cada tecla na hora, inclusive o `0x03` que o terminal
    // manda no Ctrl+C — e que de outro modo seria consumido como sinal, ou
    // engolido pelo `cmd.exe` do npm.
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('data', (chunk) => {
      if (chunk.includes(ETX)) {
        shutdown();
        return;
      }

      // Qualquer outra tecla segue para o filho, para o que ele quiser fazer.
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(chunk);
      }
    });
  }

  // ---------------------------------------------------------------- gatilho 2
  process.on('SIGINT', () => {
    shutdown();
  });
  process.on('SIGTERM', () => {
    shutdown();
  });

  // ---------------------------------------------------------------- gatilho 3
  // Se o npm (ou o `cmd.exe` que ele insere) morrer, ninguém mais vai mandar
  // sinal nenhum — e é aí que a porta fica presa com o terminal já liberado.
  //
  // ✅ Verificado em 13/09/2026: matando **só** o `cmd.exe` pai (sem `/T`), o
  // wrapper percebeu em 1 s, derrubou o Expo junto e liberou a 8081.
  //
  // ⚠️ **Limite conhecido:** o Windows não reatribui pai, e o PID de um
  // processo morto pode ser **reciclado**. Se outro processo qualquer nascer com
  // o PID do pai antes do próximo poll, o `kill(pid, 0)` passa a ter sucesso e
  // este gatilho silenciosamente para de valer. É improvável na janela de
  // segundos depois de um Ctrl+C, e é por isso que ele é o **terceiro** gatilho
  // e não o primeiro: quem carrega a garantia é o `0x03` do stdin.
  const parentPid = process.ppid;
  const parentWatch = setInterval(() => {
    try {
      // Sinal 0 não mata: só pergunta se o processo ainda existe.
      process.kill(parentPid, 0);
    } catch {
      shutdown('o processo pai saiu; encerrando o servidor para não deixar a porta presa');
    }
  }, PARENT_POLL_MS);

  parentWatch.unref();

  // 🔴 A última linha de defesa: o que quer que encerre este processo — saída
  // limpa, erro não tratado, `process.exit` acima — o filho não pode sobreviver.
  process.on('exit', killTree);

  child.on('exit', (code, signal) => {
    clearInterval(parentWatch);

    if (interceptStdin && process.stdin.isTTY) {
      // Sem isto o terminal fica em modo bruto depois que o comando sai, e as
      // teclas param de aparecer no prompt.
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.exit(signal ? 130 : (code ?? 0));
  });

  return child;
}
