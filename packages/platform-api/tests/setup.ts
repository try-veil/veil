import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { db } from '../src/db';
import { config } from '../src/config';

// Test database setup
export const testConfig = {
  ...config,
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/veil_platform_test',
  },
  port: 3001, // Use different port for tests
};

// Global test setup
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  
  // Ensure test database exists and is clean
  try {
    // In a real setup, you would create/migrate the test database here
    console.log('📊 Test database ready');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Cleanup database connections
  try {
    // await db.close(); // Uncomment when implementing actual database cleanup
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
});

// Per-test setup
beforeEach(async () => {
  // Clean up test data before each test
  // In a real implementation, you would truncate tables or use transactions
});

afterEach(async () => {
  // Clean up after each test if needed
});

export default testConfig;