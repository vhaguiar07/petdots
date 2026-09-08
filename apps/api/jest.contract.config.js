/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/contract.spec.ts'],
  testTimeout: 60_000,
  extensionsToTreatAsEsm: ['.ts'],
  // TypeScript emits ESM specifiers ending in `.js`; on disk they are `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
};
