const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve packages from the monorepo root (npm workspaces).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Com `disableHierarchicalLookup`, pacotes como `pretty-format` resolvem para a
// cópia hoisted na raiz do monorepo em vez da versão aninhada dentro de
// `@expo/metro-runtime`. A resolução via "package exports" dessa cópia hoisted
// aponta para o build ESM (`index.mjs`), cujo interop CJS quebra no bundle web
// ("Cannot read properties of undefined (reading 'default')"). Desabilitar
// `unstable_enablePackageExports` faz o Metro usar o campo "main" (CJS) e evita o problema.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
