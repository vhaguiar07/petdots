// A landing não usa a base comum de `@petdots/config`: aquela config é
// type-checked sobre `moduleResolution: node16`, e a resolução deste workspace
// é a do bundler do Next (`bundler`), com `jsx: preserve` — mesmo raciocínio do
// ADR-0008 #3 para o `apps/app`. `eslint-config-next` é a config que conhece
// React, os hooks e as regras de Core Web Vitals do App Router.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts']),
  ...nextVitals,
  ...nextTs,
  {
    // Sem isto o `eslint-plugin-react` que vem no `eslint-config-next` tenta
    // autodetectar a versão do React por um caminho que o ESLint 10 removeu
    // (`context.getFilename`), e o lint morre ao carregar a primeira regra.
    // Declarar a versão pula a detecção — é o mesmo contorno do `apps/app`.
    settings: { react: { version: '19.2.3' } },
    rules: {
      // O `eslint-plugin-import` que vem no `eslint-config-next` carrega um
      // resolver de TypeScript incompatível ("invalid interface loaded as
      // resolver") e passa a reportar todo import como não resolvido. O
      // monorepo já cobre esse eixo com `import-x` nos demais workspaces, e
      // quem de fato resolve os módulos desta app é o `tsc` (typecheck) e o
      // Turbopack (build) — os dois rodam no CI.
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/no-duplicates': 'off',
      'import/default': 'off',
      'import/export': 'off',
    },
  },
]);
