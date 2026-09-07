// Publishes packages/contracts/openapi.json from the running route table.
// A wrapper (instead of an inline env var) keeps the command identical on
// Windows and on the CI runner.
process.env.WRITE_OPENAPI = '1';

require('../dist/main');
