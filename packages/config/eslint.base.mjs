import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat config base do monorepo. Cada workspace expõe um `eslint.config.mjs`
 * que chama esta função com o próprio diretório, para que o type-checked
 * linting encontre o tsconfig local.
 *
 * @param {string} tsconfigRootDir diretório do workspace (use `import.meta.dirname`)
 */
export function createEslintConfig(tsconfigRootDir) {
  return tseslint.config(
    {
      ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.mjs', '**/*.js'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      plugins: { 'import-x': importX },
      rules: {
        // A leading underscore is the project's way of saying "bound on
        // purpose, not used" — destructuring something out, an unused handler
        // argument. TypeScript already honours it via noUnusedLocals.
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        // O hoisting do npm workspaces achata node_modules na raiz: sem esta
        // regra, um workspace consegue importar um pacote que não declarou
        // no próprio package.json sem que nada reclame localmente.
        'import-x/no-extraneous-dependencies': [
          'error',
          {
            // `test/**` cobre os helpers compartilhados de suite (ex.:
            // `apps/api/test/support/postgres.ts`), que são código de teste
            // sem serem, eles próprios, um arquivo de spec.
            devDependencies: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**'],
            optionalDependencies: false,
            peerDependencies: true,
            packageDir: tsconfigRootDir,
          },
        ],
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
      languageOptions: { globals: { ...globals.jest } },
    },
    prettier,
  );
}
