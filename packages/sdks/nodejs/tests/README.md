# Veil SDK Tests

This directory contains comprehensive tests for the Veil Node.js SDK.

## Test Structure

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── client.test.ts      # VeilClient API management methods
│   ├── api-keys.test.ts    # API key management methods
│   ├── error-handling.test.ts # Error handling and edge cases
│   └── test-helpers.ts     # Shared test utilities
├── integration/            # Integration tests
│   └── scenarios.test.ts   # End-to-end workflow scenarios
├── types.test.ts          # TypeScript type validation tests
└── setup.ts               # Jest configuration and setup

__mocks__/                 # Mock implementations
├── axios.ts               # Axios mock for HTTP requests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Files
```bash
# Unit tests only
npx jest tests/unit/

# Integration tests only
npx jest tests/integration/

# Specific test file
npx jest tests/unit/client.test.ts
```

## Test Categories

### Unit Tests (`tests/unit/`)

**client.test.ts**
- VeilClient constructor and configuration
- API management methods (onboard, update, patch, delete)
- HTTP client configuration and headers
- Basic error handling

**api-keys.test.ts**
- API key addition (POST and PUT methods)
- API key deletion
- API key status updates (PUT and PATCH methods)
- Validation and edge cases

**error-handling.test.ts**
- VeilError class functionality
- HTTP status code error handling
- Network and timeout errors
- Response format validation
- Error context preservation

**test-helpers.ts**
- Sample test data and fixtures
- Mock response creators
- Validation helper functions
- Test utilities

### Integration Tests (`tests/integration/`)

**scenarios.test.ts**
- Complete API lifecycle workflows
- Multi-API management scenarios
- Key rotation workflows
- Configuration update scenarios
- Error recovery scenarios
- Performance and concurrency tests

### Type Tests (`tests/types.test.ts`)
- TypeScript interface validation
- Type constraint enforcement
- Optional/required field validation
- Generic type handling

## Test Configuration

### Jest Configuration (`jest.config.js`)
- TypeScript support with ts-jest
- Coverage thresholds (80% minimum)
- Custom test matchers
- Setup files and timeouts

### Custom Matchers
- `toBeVeilError()`: Validates VeilError instances
- `toHaveValidAPIResponse()`: Validates API response format

### Setup and Teardown (`setup.ts`)
- Global test configuration
- Console suppression in tests
- Custom Jest matchers
- Test environment setup

## Test Data and Mocking

### Mock Strategy
- **axios-mock-adapter**: HTTP request mocking
- **Jest mocks**: Function and module mocking
- **Test fixtures**: Predefined sample data

### Sample Data
- API onboarding requests
- API key management requests
- Response objects (success and error)
- Configuration objects

## Coverage Requirements

- **Minimum Coverage**: 80% for all metrics
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Exclusions
- Example files (`src/examples/`)
- Type declaration files (`*.d.ts`)
- Main export file (`src/index.ts`)

## Test Best Practices

### Writing Tests
1. **Descriptive Test Names**: Use clear, specific descriptions
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Use mocks for HTTP requests
5. **Test Edge Cases**: Include error scenarios and boundary conditions

### Mock Usage
```typescript
// Setup mock responses
mockAxios.onPost('/veil/api/routes').reply(201, successResponse);

// Verify mock calls
expect(mockAxios.history.post).toHaveLength(1);
```

### Error Testing
```typescript
// Test error scenarios
await expect(client.onboardAPI(invalidRequest))
  .rejects.toBeVeilError();
```

### Integration Testing
```typescript
// Test complete workflows
const onboardResult = await client.onboardAPI(config);
const keysResult = await client.addAPIKeys(keyConfig);
const deleteResult = await client.deleteAPI(path);
```

## Debugging Tests

### Debug Mode
```bash
DEBUG_TESTS=true npm test
```

### Verbose Output
```bash
npx jest --verbose
```

### Debug Specific Test
```bash
npx jest --testNamePattern="should handle API onboarding" --verbose
```

### Coverage Report Location
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV File**: `coverage/lcov.info`
- **Text Summary**: Console output

## CI/CD Integration

The test suite is designed for CI/CD environments:

- **Exit Codes**: Proper exit codes for CI systems
- **Coverage Reports**: LCOV format for coverage tools
- **Parallel Execution**: Tests can run in parallel
- **Timeout Handling**: Appropriate timeouts for CI environments

## Adding New Tests

### Unit Test Template
```typescript
describe('Feature', () => {
  let client: VeilClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    client = new VeilClient();
    mockAxios = new MockAdapter((client as any).http);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  it('should do something', async () => {
    // Arrange
    mockAxios.onPost('/endpoint').reply(200, response);

    // Act
    const result = await client.method(request);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Integration Test Template
```typescript
describe('Workflow', () => {
  it('should complete end-to-end scenario', async () => {
    // Setup multiple mock responses
    mockAxios
      .onPost('/endpoint1').replyOnce(201, response1)
      .onPut('/endpoint2').replyOnce(200, response2);

    // Execute workflow
    const result1 = await client.method1();
    const result2 = await client.method2();

    // Verify complete workflow
    expect(result1.status).toBe('success');
    expect(result2.status).toBe('success');
    expect(mockAxios.history.post).toHaveLength(1);
    expect(mockAxios.history.put).toHaveLength(1);
  });
});
```