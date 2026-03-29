import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  jest.clearAllMocks();
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
