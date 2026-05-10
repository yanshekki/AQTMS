// Global test setup for e2e (mock external services, DB, etc.)
// Extend Jest with custom matchers if needed
beforeAll(() => {
  // e.g. mock ccxt for live execution in paper→live tests
  jest.mock('ccxt');
});
