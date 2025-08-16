# Veil Node.js SDK

A comprehensive TypeScript/JavaScript SDK for the Veil API Gateway Management Server. This SDK provides a simple and intuitive interface for managing API configurations, API keys, and routing through the Veil Caddy module.

## Installation

```bash
npm install @veil/nodejs-sdk
```

## Quick Start

```typescript
import { VeilClient } from '@veil/nodejs-sdk';

// Create a client instance
const client = new VeilClient({
  baseUrl: 'http://localhost:2020', // Management API URL
  timeout: 30000
});

// Onboard a new API
const response = await client.onboardAPI({
  path: '/weather/*',
  upstream: 'http://localhost:8083/weather',
  required_subscription: 'weather-subscription',
  methods: ['GET'],
  required_headers: ['X-Test-Header'],
  api_keys: [{
    key: 'weather-api-key-1',
    name: 'Weather API Key',
    is_active: true
  }]
});

console.log('API onboarded:', response);
```

## Features

- **Complete API Management**: Onboard, update, patch, and delete API configurations
- **API Key Management**: Add, delete, and manage API key status
- **TypeScript Support**: Full type definitions included
- **Error Handling**: Comprehensive error handling with detailed error information
- **Promise-based**: Modern async/await support
- **Configurable**: Flexible client configuration options

## API Reference

### Client Configuration

```typescript
interface VeilClientOptions {
  baseUrl?: string;      // Default: 'http://localhost:2020'
  timeout?: number;      // Default: 30000ms
  headers?: Record<string, string>; // Additional headers
}
```

### API Management

#### Onboard API

```typescript
await client.onboardAPI({
  path: '/api/*',
  upstream: 'http://localhost:8080/api',
  required_subscription: 'premium',
  methods: ['GET', 'POST'],
  required_headers: ['Authorization'],
  api_keys: [{
    key: 'api-key-123',
    name: 'Production Key',
    is_active: true
  }]
});
```

#### Update API

```typescript
await client.updateAPI('/api/*', {
  path: '/api/*',
  upstream: 'http://localhost:8081/api',
  methods: ['GET', 'POST', 'PUT'],
  // ... other fields
});
```

#### Partial Update API

```typescript
await client.patchAPI('/api/*', {
  upstream: 'http://localhost:8082/api'
});
```

#### Delete API

```typescript
await client.deleteAPI('/api/*');
```

### API Key Management

#### Add API Keys

```typescript
await client.addAPIKeys({
  path: '/api/*',
  api_keys: [{
    key: 'new-key-456',
    name: 'New API Key',
    is_active: true
  }]
});
```

#### Update API Key Status

```typescript
await client.updateAPIKeyStatus({
  path: '/api/*',
  api_key: 'api-key-123',
  is_active: false
});
```

#### Delete API Key

```typescript
await client.deleteAPIKey({
  path: '/api/*',
  api_key: 'api-key-123'
});
```

## Error Handling

The SDK provides comprehensive error handling through the `VeilError` class:

```typescript
import { VeilError } from '@veil/nodejs-sdk';

try {
  await client.onboardAPI(apiConfig);
} catch (error) {
  if (error instanceof VeilError) {
    console.error('Veil API Error:', error.message);
    console.error('Status Code:', error.status);
    console.error('Response:', error.response);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

### Complete API Lifecycle

```typescript
import { VeilClient } from '@veil/nodejs-sdk';

const client = new VeilClient();

async function apiLifecycle() {
  try {
    // 1. Onboard a new API
    const onboardResponse = await client.onboardAPI({
      path: '/weather/*',
      upstream: 'http://localhost:8083/weather',
      required_subscription: 'weather-subscription',
      methods: ['GET'],
      required_headers: ['X-Test-Header'],
      api_keys: [{
        key: 'initial-weather-key',
        name: 'Initial Weather Key',
        is_active: true
      }]
    });
    
    console.log('✅ API onboarded:', onboardResponse.message);

    // 2. Add additional API keys
    await client.addAPIKeys({
      path: '/weather/*',
      api_keys: [{
        key: 'additional-weather-key',
        name: 'Additional Weather Key',
        is_active: true
      }]
    });
    
    console.log('✅ API keys added');

    // 3. Deactivate a key
    await client.updateAPIKeyStatus({
      path: '/weather/*',
      api_key: 'initial-weather-key',
      is_active: false
    });
    
    console.log('✅ API key deactivated');

    // 4. Update API configuration
    await client.patchAPI('/weather/*', {
      methods: ['GET', 'POST']
    });
    
    console.log('✅ API updated');

    // 5. Clean up - delete API
    await client.deleteAPI('/weather/*');
    console.log('✅ API deleted');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

apiLifecycle();
```

### Multiple Environment Setup

```typescript
import { VeilClient } from '@veil/nodejs-sdk';

// Development environment
const devClient = new VeilClient({
  baseUrl: 'http://localhost:2020'
});

// Production environment
const prodClient = new VeilClient({
  baseUrl: 'https://api-gateway.prod.example.com',
  timeout: 60000,
  headers: {
    'X-Environment': 'production'
  }
});
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type { 
  APIOnboardRequest, 
  APIResponse, 
  APIConfig,
  VeilClientOptions 
} from '@veil/nodejs-sdk';

const config: APIOnboardRequest = {
  path: '/api/*',
  upstream: 'http://localhost:8080',
  methods: ['GET', 'POST'],
  // TypeScript will provide autocomplete and validation
};
```

## Architecture

The Veil system operates on two main ports:

- **Port 2020**: Management API for onboarding and configuration (this SDK)
- **Port 2021**: Proxied APIs with validation and key authentication

This SDK interacts with the management API (port 2020) to configure the gateway. Your applications will then make requests to the proxied APIs (port 2021) using the configured API keys.

## Contributing

Contributions are welcome! Please see the main Veil repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/try-veil/veil/issues
- Documentation: https://github.com/try-veil/veil#readme