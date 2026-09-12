/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  // The contract test is its own CI gate (`npm run test:contract`).
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/contract\\.spec\\.ts$'],
  setupFiles: ['<rootDir>/test/support/jest-env.ts'],
  // Testcontainers pulls postgres:16-alpine on the first run.
  testTimeout: 120_000,
  extensionsToTreatAsEsm: ['.ts'],
  // TypeScript emits ESM specifiers ending in `.js`; on disk they are `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
};
