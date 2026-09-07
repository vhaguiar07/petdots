import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
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
      },
    },
    {
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
      languageOptions: { globals: { ...globals.jest } },
    },
    prettier,
  );
}
