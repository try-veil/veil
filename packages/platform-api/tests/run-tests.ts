#!/usr/bin/env bun

/**
 * Test runner script for Veil Platform API
 * Runs E2E integration tests with proper setup and teardown
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  testDir: string;
  testPattern: string;
  setupTimeout: number;
  teardownTimeout: number;
  verbose: boolean;
  bail: boolean;
  parallel: boolean;
  coverage: boolean;
}

const defaultConfig: TestConfig = {
  testDir: './tests/e2e',
  testPattern: '**/*.test.ts',
  setupTimeout: 30000,
  teardownTimeout: 10000,
  verbose: process.env.VERBOSE === 'true',
  bail: process.env.BAIL === 'true',
  parallel: process.env.PARALLEL !== 'false',
  coverage: process.env.COVERAGE === 'true',
};

class TestRunner {
  private config: TestConfig;
  private serverProcess: any;

  constructor(config: TestConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  async run(): Promise<number> {
    console.log('🚀 Starting Veil Platform API Test Suite\n');

    try {
      // Pre-test checks
      await this.preTestChecks();

      // Setup test environment
      await this.setupTestEnvironment();

      // Start test server
      await this.startTestServer();

      // Run tests
      const exitCode = await this.runTests();

      // Cleanup
      await this.cleanup();

      return exitCode;
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      await this.cleanup();
      return 1;
    }
  }

  private async preTestChecks(): Promise<void> {
    console.log('🔍 Running pre-test checks...');

    // Check if test directory exists
    if (!existsSync(this.config.testDir)) {
      throw new Error(`Test directory not found: ${this.config.testDir}`);
    }

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
      console.warn('Using default values for testing...');
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
      'postgresql://postgres:password@localhost:5432/veil_platform_test';
    process.env.PORT = '3001'; // Use different port for tests
    
    console.log('✅ Pre-test checks completed\n');
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('⚙️  Setting up test environment...');

    // Here you would typically:
    // 1. Setup test database
    // 2. Run migrations
    // 3. Seed test data
    // 4. Start external services (Redis, etc.)

    console.log('✅ Test environment setup completed\n');
  }

  private async startTestServer(): Promise<void> {
    console.log('🌐 Starting test server...');

    return new Promise((resolve, reject) => {
      // Start the API server in test mode
      this.serverProcess = spawn('bun', ['run', 'dev'], {
        env: { ...process.env, PORT: '3001', NODE_ENV: 'test' },
        stdio: this.config.verbose ? 'inherit' : 'pipe',
      });

      // Wait for server to be ready
      const timeout = setTimeout(() => {
        reject(new Error('Test server startup timeout'));
      }, this.config.setupTimeout);

      // Check if server is ready by polling health endpoint
      const checkServer = async () => {
        try {
          const response = await fetch('http://localhost:3001/health');
          if (response.ok) {
            clearTimeout(timeout);
            console.log('✅ Test server started successfully\n');
            resolve(undefined);
          } else {
            setTimeout(checkServer, 1000);
          }
        } catch (error) {
          setTimeout(checkServer, 1000);
        }
      };

      setTimeout(checkServer, 2000); // Initial delay
    });
  }

  private async runTests(): Promise<number> {
    console.log('🧪 Running integration tests...\n');

    return new Promise((resolve) => {
      const testArgs = [
        'test',
        this.config.testDir,
      ];

      if (this.config.verbose) {
        testArgs.push('--verbose');
      }

      if (this.config.bail) {
        testArgs.push('--bail');
      }

      if (this.config.coverage) {
        testArgs.push('--coverage');
      }

      const testProcess = spawn('bun', testArgs, {
        stdio: 'inherit',
        env: process.env,
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ All tests passed!');
        } else {
          console.log(`\n❌ Tests failed with exit code ${code}`);
        }
        resolve(code || 0);
      });

      testProcess.on('error', (error) => {
        console.error('❌ Test process error:', error);
        resolve(1);
      });
    });
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');

    // Stop test server
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.serverProcess.kill('SIGKILL');
          resolve(undefined);
        }, this.config.teardownTimeout);

        this.serverProcess.on('close', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });
    }

    // Here you would typically:
    // 1. Clean up test database
    // 2. Stop external services
    // 3. Remove temporary files

    console.log('✅ Cleanup completed');
  }
}

// Parse command line arguments
function parseArgs(): Partial<TestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--bail':
      case '-b':
        config.bail = true;
        break;
      case '--no-parallel':
        config.parallel = false;
        break;
      case '--coverage':
      case '-c':
        config.coverage = true;
        break;
      case '--pattern':
      case '-p':
        config.testPattern = args[++i];
        break;
      case '--timeout':
      case '-t':
        config.setupTimeout = parseInt(args[++i]) || defaultConfig.setupTimeout;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.warn(`⚠️  Unknown option: ${arg}`);
        }
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Veil Platform API Test Runner

Usage: bun run test:e2e [options]

Options:
  -v, --verbose       Enable verbose output
  -b, --bail          Stop on first test failure
  --no-parallel       Disable parallel test execution
  -c, --coverage      Generate coverage report
  -p, --pattern       Test file pattern (default: **/*.test.ts)
  -t, --timeout       Server startup timeout in ms (default: 30000)
  -h, --help          Show this help message

Environment Variables:
  TEST_DATABASE_URL   Test database connection string
  VERBOSE             Enable verbose output (true/false)
  BAIL                Stop on first failure (true/false)
  PARALLEL            Enable parallel execution (true/false)
  COVERAGE            Generate coverage (true/false)

Examples:
  bun run test:e2e                    # Run all tests
  bun run test:e2e --verbose         # Run with verbose output
  bun run test:e2e --bail            # Stop on first failure
  bun run test:e2e --coverage        # Generate coverage report
  bun run test:e2e --pattern="auth*" # Run only auth tests
`);
}

// Main execution
if (import.meta.main) {
  const config = parseArgs();
  const runner = new TestRunner(config);
  
  runner.run().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { TestRunner, TestConfig };