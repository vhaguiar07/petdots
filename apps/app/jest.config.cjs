/**
 * The first test suite of `apps/app`.
 *
 * 🔴 It tests **logic, not rendering**, and that is the decision, not a
 * shortcut (ADR-0012, A11): what can sign somebody out by mistake is the
 * refresh machinery and the storage round-trip, never the JSX. Rendering stays
 * covered by `lint`, `typecheck` and `expo export`, which is why no rendering
 * library is installed here.
 *
 * `jest-expo/node` rather than the universal preset for the same reason: every
 * suite here is plain TypeScript with a fake `fetch` and a fake
 * `localStorage`, so running each one three times over the React Native
 * transform would buy nothing. The universal preset is what to reach for the
 * day a suite needs a component.
 *
 * `.cjs` because `apps/app` is `"type": "module"` and Jest loads its config as
 * CommonJS.
 */
module.exports = {
  preset: 'jest-expo/node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  // ⚠️ The app has no `babel.config.js` — Metro gets `babel-preset-expo` from
  // its own transformer — so `babel-jest` would find no config and fail to
  // parse TypeScript. Naming the preset here fixes Jest without adding a Babel
  // config that would also change what Metro produces.
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
        caller: { name: 'metro', bundler: 'metro', platform: 'web', isServer: true },
      },
    ],
  },
};
