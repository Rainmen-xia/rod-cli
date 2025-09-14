// Jest setup file for global test configuration

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any test artifacts
});

// Restore console methods after all tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities - removed to fix compilation issues

// Custom matchers
expect.extend({
  toBeValidPath(received: string) {
    const pass = typeof received === 'string' && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid path`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid path`,
        pass: false,
      };
    }
  },
});