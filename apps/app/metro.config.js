// Sintaxe CJS de propósito: o Metro carrega este arquivo com o próprio
// carregador, não com o ESM nativo do Node, então `require`/`module.exports`
// funcionam mesmo com `"type": "module"` no package.json deste workspace.
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Sem isto o Metro não observa `packages/*` e uma edição num pacote do
// workspace não invalida o bundle do app.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
