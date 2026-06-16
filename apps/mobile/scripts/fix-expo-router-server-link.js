#!/usr/bin/env node
// Workaround para um caso de hoisting do npm workspaces: @expo/cli depende de
// @expo/router-server, que tem expo-router como peerDependency opcional ("*").
// O npm não promove expo-router para a raiz (fica só em apps/mobile/node_modules),
// então a resolução via `require` do @expo/router-server (usada para gerar tipos
// de rotas) falha com "Cannot find module 'expo-router/_ctx-shared'". Criamos um
// link apontando para a cópia já instalada em apps/mobile/node_modules/expo-router.
// Roda como postinstall, pois `npm install`/`rm -rf node_modules` recria a árvore.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const target = path.join(repoRoot, 'apps', 'mobile', 'node_modules', 'expo-router');
const linkDir = path.join(
  repoRoot,
  'node_modules',
  '@expo',
  'cli',
  'node_modules',
  '@expo',
  'router-server',
  'node_modules',
);
const link = path.join(linkDir, 'expo-router');

if (!fs.existsSync(target)) {
  // apps/mobile/node_modules/expo-router ainda não existe (ex.: install parcial) — nada a fazer.
  process.exit(0);
}

if (!fs.existsSync(linkDir)) {
  // @expo/cli/.../router-server não está instalado — nada a fazer.
  process.exit(0);
}

if (fs.existsSync(link)) {
  process.exit(0);
}

fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
console.log(`[fix-expo-router-server-link] link criado: ${link} -> ${target}`);
