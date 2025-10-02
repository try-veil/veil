# Testing Suite - Veil Platform API

Comprehensive testing framework for the Veil Platform API, including unit tests, integration tests, and end-to-end tests.

## Overview

This testing suite provides:
- **End-to-End Tests**: Full workflow testing with real HTTP requests
- **Integration Tests**: Component integration testing
- **Unit Tests**: Individual function and module testing
- **Manual Testing**: Step-by-step manual testing procedures
- **Performance Tests**: Load and stress testing scenarios

## Quick Start

### Prerequisites
```bash
# Install dependencies
bun install

# Setup test database
export TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/veil_platform_test"

# Start PostgreSQL for tests
docker run -d --name postgres-veil-test \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=veil_platform_test \
  -p 5433:5432 postgres:15
```

### Run All Tests
```bash
# Run complete test suite
bun run test:e2e

# Run with verbose output
bun run test:e2e:verbose

# Run with coverage report
bun run test:e2e:coverage
```

## Test Structure

```
tests/
├── e2e/                          # End-to-end integration tests
│   ├── auth-flow.test.ts         # Authentication and authorization
│   ├── marketplace-flow.test.ts  # API discovery and marketplace
│   ├── provider-flow.test.ts     # API provider workflows
│   └── subscription-payment-flow.test.ts # Payments and subscriptions
├── fixtures/                     # Test data and fixtures
│   └── test-data.ts              # Sample data for testing
├── utils/                        # Testing utilities and helpers
│   └── test-helpers.ts           # Common test functions
├── setup.ts                      # Global test setup
├── run-tests.ts                  # Test runner script
├── README.md                     # This file
└── MANUAL_TESTING.md            # Manual testing procedures
```

## Test Categories

### 1. Authentication Flow Tests
- User registration and validation
- Login/logout functionality
- JWT token management
- Password reset flow
- Role-based access control

### 2. Marketplace Flow Tests
- API discovery and search
- Category management
- API filtering and sorting
- Pagination
- API recommendations
- Reviews and ratings

### 3. Provider Flow Tests
- API submission process
- Seller dashboard
- API management (CRUD)
- Approval workflow
- Revenue analytics
- Documentation management

### 4. Subscription & Payment Tests
- Subscription tier management
- Payment processing
- Usage-based billing
- Payment method management
- Invoicing
- Webhook handling

## Test Configuration

### Environment Variables
```bash
# Test Environment
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5433/veil_platform_test
PORT=3001

# Authentication
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRES_IN=7d

# External Services (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
CADDY_MANAGEMENT_URL=http://localhost:2020
```

### Test Data
Test fixtures are located in `tests/fixtures/test-data.ts`:
- User accounts with different roles
- Sample APIs with various configurations
- Subscription tiers and pricing
- Payment scenarios
- Mock external service responses

## Running Tests

### Individual Test Suites
```bash
# Authentication tests only
bun test tests/e2e/auth-flow.test.ts

# Marketplace tests only
bun test tests/e2e/marketplace-flow.test.ts

# Provider workflow tests
bun test tests/e2e/provider-flow.test.ts

# Payment and subscription tests
bun test tests/e2e/subscription-payment-flow.test.ts
```

### Test Options
```bash
# Stop on first failure
bun run test:e2e --bail

# Run specific test pattern
bun test --grep="authentication"

# Watch mode for development
bun test --watch

# Generate coverage report
bun run test:e2e:coverage

# CI mode (optimized for CI/CD)
bun run test:ci
```

### Performance Testing
```bash
# Load testing with Apache Bench
ab -n 1000 -c 50 http://localhost:3001/api/v1/marketplace

# Memory usage monitoring
bun run test:e2e --memory-profile

# Database performance
bun run test:db-performance
```

## Test Utilities

### TestClient
HTTP client for making API requests:
```typescript
import { TestClient } from '../utils/test-helpers';

const client = new TestClient('http://localhost:3001');
client.setAuthToken(token);
const response = await client.get('/api/v1/profile');
```

### TestDatabase
Database utilities for test data:
```typescript
import { TestDatabase } from '../utils/test-helpers';

const user = await TestDatabase.createUser({ role: 'admin' });
const api = await TestDatabase.createAPI({ name: 'Test API' });
```

### Assertions
Validation helpers:
```typescript
import { expectSuccessResponse, assertValidResponse } from '../utils/test-helpers';

expectSuccessResponse(response, 201);
assertValidResponse(data, ['id', 'name', 'email']);
```

## Mock Services

### Caddy Gateway Mock
```typescript
import { MockCaddyServer } from '../utils/test-helpers';

const mockCaddy = MockCaddyServer.getInstance();
mockCaddy.mockOnboardAPI({ status: 'success' });
```

### Payment Provider Mock
Test with mock payment responses:
```typescript
const mockStripeResponse = {
  id: 'pi_test_123',
  status: 'succeeded',
  amount: 2500
};
```

## Error Testing

### Common Error Scenarios
- Invalid authentication tokens
- Validation failures
- Rate limiting
- Payment failures
- External service timeouts
- Database connection issues

### Example Error Tests
```typescript
test('should return 401 for invalid token', async () => {
  client.setAuthToken('invalid-token');
  const response = await client.get('/api/v1/profile');
  expectErrorResponse(response, 401);
  
  const data = await expectJsonResponse(response);
  assertValidErrorResponse(data, 'INVALID_TOKEN');
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: veil_platform_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
        
      - name: Run tests
        run: bun run test:ci
        env:
          TEST_DATABASE_URL: postgresql://postgres:password@localhost:5432/veil_platform_test
```

### Docker Test Environment
```dockerfile
FROM oven/bun:1.0-slim

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install

COPY . .
ENV NODE_ENV=test
CMD ["bun", "run", "test:ci"]
```

## Test Data Management

### Database Seeding
```bash
# Seed test database with sample data
bun run db:seed:test

# Reset test database
bun run db:reset:test
```

### Test Isolation
Each test suite:
- Uses transaction rollback for database isolation
- Clears authentication tokens between tests
- Resets mock service states
- Cleans up temporary data

## Debugging Tests

### Verbose Mode
```bash
# Run with detailed output
bun run test:e2e:verbose

# Debug specific test
DEBUG=test:* bun test tests/e2e/auth-flow.test.ts
```

### Test Debugging Tools
- Request/response logging
- Database query logging
- Memory usage tracking
- Performance profiling
- Error stack traces

## Performance Benchmarks

### Response Time Targets
- Authentication: < 200ms
- Marketplace listing: < 500ms
- API submission: < 1000ms
- Payment processing: < 2000ms

### Load Testing Results
```bash
# Marketplace endpoint
Requests per second: 500+ RPS
Average response time: 150ms
95th percentile: 300ms

# Authentication endpoint
Requests per second: 1000+ RPS
Average response time: 80ms
95th percentile: 150ms
```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Check PostgreSQL status
   docker ps | grep postgres
   
   # Verify connection string
   echo $TEST_DATABASE_URL
   ```

2. **Port Conflicts**
   ```bash
   # Check if port 3001 is available
   lsof -i :3001
   
   # Use alternative port
   PORT=3002 bun run test:e2e
   ```

3. **Authentication Errors**
   ```bash
   # Check JWT secret
   echo $JWT_SECRET
   
   # Verify token format
   node -e "console.log(require('jsonwebtoken').decode('$TOKEN'))"
   ```

### Debug Logs
```bash
# Enable debug logging
LOG_LEVEL=debug bun run test:e2e

# Database query logging
DB_DEBUG=true bun run test:e2e

# HTTP request logging
HTTP_DEBUG=true bun run test:e2e
```

## Contributing

### Adding New Tests
1. Create test files in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Use existing test utilities and helpers
4. Include both success and error scenarios
5. Add documentation for complex test scenarios

### Test Writing Guidelines
- **Descriptive test names**: Use clear, specific descriptions
- **Independent tests**: Each test should be self-contained
- **Proper cleanup**: Clean up test data after each test
- **Error scenarios**: Test both success and failure cases
- **Performance considerations**: Set appropriate timeouts

### Example Test Structure
```typescript
describe('Feature Name', () => {
  let client: TestClient;
  let testUser: any;

  beforeAll(async () => {
    // Setup shared resources
  });

  beforeEach(async () => {
    // Setup test-specific data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('Success Scenarios', () => {
    test('should handle valid input', async () => {
      // Test implementation
    });
  });

  describe('Error Scenarios', () => {
    test('should reject invalid input', async () => {
      // Test implementation
    });
  });
});
```

## Resources

- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
- [HTTP Testing Best Practices](https://restfulapi.net/testing/)
- [API Testing Guide](https://apidog.com/articles/api-testing-guide/)
- [Performance Testing Strategies](https://k6.io/docs/)