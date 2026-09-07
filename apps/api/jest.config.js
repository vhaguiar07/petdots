/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  // The contract test is its own CI gate (`npm run test:contract`).
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/contract\\.spec\\.ts$'],
  // Testcontainers pulls postgres:16-alpine on the first run.
  testTimeout: 120_000,
};
