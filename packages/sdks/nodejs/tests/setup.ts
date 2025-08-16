/**
 * Jest setup file for Veil SDK tests
 */

// Extend Jest matchers if needed
import 'jest';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn in tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test helpers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVeilError(): R;
      toHaveValidAPIResponse(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeVeilError(received) {
    const pass = received?.name === 'VeilError' && 
                 typeof received?.message === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a VeilError`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a VeilError`,
        pass: false,
      };
    }
  },

  toHaveValidAPIResponse(received) {
    const pass = received?.status && 
                 typeof received?.message === 'string' && 
                 (received.status === 'success' || received.status === 'error');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid API response format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid API response format with status and message`,
        pass: false,
      };
    }
  }
});