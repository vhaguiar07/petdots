// O app não usa a base comum de `@petdots/config`: aquela config é
// type-checked sobre `moduleResolution: node16`, e a resolução deste workspace
// é a do Metro (`bundler`) — ver ADR-0008. `eslint-config-expo` é a config que
// conhece React, React Native e as regras de hooks.
import expo from 'eslint-config-expo/flat.js';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/**', '.expo/**', 'node_modules/**']),
  expo,
  {
    // Sem isto o `eslint-plugin-react` que vem no `eslint-config-expo` tenta
    // autodetectar a versão do React por um caminho que o ESLint 10 removeu
    // (`context.getFilename`), e o lint morre ao carregar a primeira regra.
    // Declarar a versão pula a detecção. A alternativa seria o
    // `eslint-plugin-react` 7.8.0-rc.0, o único que declara peer para o
    // ESLint 10 — e é pré-release.
    settings: { react: { version: '19.2.3' } },
    rules: {
      // O `eslint-plugin-import` que vem no `eslint-config-expo` carrega um
      // resolver de TypeScript incompatível ("invalid interface loaded as
      // resolver") e passa a reportar todo import como não resolvido. O
      // monorepo já cobre esse eixo com `import-x` nos demais workspaces, e
      // quem de fato resolve os módulos deste app é o `tsc` (typecheck) e o
      // Metro (build) — os dois rodam no CI.
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/no-duplicates': 'off',
      'import/default': 'off',
      'import/export': 'off',

      // `no-unused-vars` do core do ESLint não entende assinatura de tipo do
      // TypeScript e acusa os parâmetros de um tipo de função. Quem cobre isso
      // aqui é o `tsc`, com `noUnusedLocals`/`noUnusedParameters`.
      'no-unused-vars': 'off',

      // O padrão de ler o armazenamento local depois da montagem é exigência
      // do export estático: o mesmo módulo roda no servidor, onde não existe
      // `localStorage`, e um valor lido durante o render divergiria da
      // hidratação. Ver `src/spike/cart/cart-context.tsx`.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
