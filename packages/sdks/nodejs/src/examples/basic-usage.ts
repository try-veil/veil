/**
 * Basic Usage Examples for Veil Node.js SDK
 */

import { VeilClient, VeilError } from '../index';

// Initialize the client
const client = new VeilClient({
  baseUrl: 'http://localhost:2020',
  timeout: 30000
});

/**
 * Example 1: Basic API Onboarding
 */
async function basicOnboarding() {
  try {
    const response = await client.onboardAPI({
      path: '/weather/*',
      upstream: 'http://localhost:8083/weather',
      required_subscription: 'weather-subscription',
      methods: ['GET'],
      required_headers: ['X-Test-Header'],
      api_keys: [{
        key: 'weather-test-key-1',
        name: 'Weather Test Key',
        is_active: true
      }]
    });

    console.log('API onboarded successfully:', response.message);
    console.log('API ID:', response.api?.id);
  } catch (error) {
    if (error instanceof VeilError) {
      console.error('Veil API Error:', error.message);
      console.error('Status:', error.status);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 2: API Key Management
 */
async function keyManagement() {
  const apiPath = '/weather/*';

  try {
    // Add new API keys
    await client.addAPIKeys({
      path: apiPath,
      api_keys: [
        {
          key: 'weather-key-2',
          name: 'Weather Key 2',
          is_active: true
        },
        {
          key: 'weather-key-3',
          name: 'Weather Key 3',
          is_active: false
        }
      ]
    });
    console.log('✅ API keys added');

    // Update key status
    await client.updateAPIKeyStatus({
      path: apiPath,
      api_key: 'weather-key-3',
      is_active: true
    });
    console.log('✅ API key activated');

    // Delete a key
    await client.deleteAPIKey({
      path: apiPath,
      api_key: 'weather-key-2'
    });
    console.log('✅ API key deleted');

  } catch (error) {
    console.error('Key management error:', error);
  }
}

/**
 * Example 3: API Configuration Updates
 */
async function apiUpdates() {
  const apiPath = '/weather/*';

  try {
    // Full update
    await client.updateAPI(apiPath, {
      path: apiPath,
      upstream: 'http://localhost:8084/weather', // New upstream
      required_subscription: 'premium-weather',
      methods: ['GET', 'POST'], // Added POST
      required_headers: ['X-Test-Header', 'Authorization'], // Added auth
      api_keys: [{
        key: 'updated-weather-key',
        name: 'Updated Weather Key',
        is_active: true
      }]
    });
    console.log('✅ API fully updated');

    // Partial update
    await client.patchAPI(apiPath, {
      upstream: 'http://localhost:8085/weather'
    });
    console.log('✅ API upstream updated');

  } catch (error) {
    console.error('Update error:', error);
  }
}

/**
 * Example 4: Complete Lifecycle with Error Handling
 */
async function completeLifecycle() {
  const apiPath = '/order/*';

  try {
    // 1. Onboard
    console.log('🚀 Onboarding order API...');
    const onboardResponse = await client.onboardAPI({
      path: apiPath,
      upstream: 'http://localhost:8082/order',
      required_subscription: 'order-subscription',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      required_headers: ['X-Auth-Token'],
      parameters: [{
        name: 'id',
        type: 'path',
        required: true
      }],
      api_keys: [{
        key: 'order-api-key-1',
        name: 'Order API Key 1',
        is_active: true
      }]
    });
    console.log('✅ Order API onboarded:', onboardResponse.message);

    // 2. Add more keys
    console.log('🔑 Adding additional API keys...');
    await client.addAPIKeys({
      path: apiPath,
      api_keys: [
        {
          key: 'order-api-key-2',
          name: 'Order API Key 2',
          is_active: true
        },
        {
          key: 'order-api-key-3',
          name: 'Order API Key 3 (Inactive)',
          is_active: false
        }
      ]
    });
    console.log('✅ Additional keys added');

    // 3. Manage key status
    console.log('🔄 Managing key status...');
    await client.updateAPIKeyStatus({
      path: apiPath,
      api_key: 'order-api-key-3',
      is_active: true
    });
    console.log('✅ Key activated');

    // 4. Update configuration
    console.log('⚙️ Updating API configuration...');
    await client.patchAPI(apiPath, {
      required_headers: ['X-Auth-Token', 'X-Request-ID']
    });
    console.log('✅ Configuration updated');

    // 5. Clean up
    console.log('🧹 Cleaning up...');
    await client.deleteAPIKey({
      path: apiPath,
      api_key: 'order-api-key-3'
    });
    console.log('✅ Key deleted');

    await client.deleteAPI(apiPath);
    console.log('✅ API deleted');

  } catch (error) {
    if (error instanceof VeilError) {
      console.error('❌ Veil Error:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

/**
 * Example 5: Batch Operations
 */
async function batchOperations() {
  const apis = [
    {
      path: '/users/*',
      upstream: 'http://localhost:8080/users',
      subscription: 'user-service'
    },
    {
      path: '/products/*',
      upstream: 'http://localhost:8081/products',
      subscription: 'product-service'
    },
    {
      path: '/orders/*',
      upstream: 'http://localhost:8082/orders',
      subscription: 'order-service'
    }
  ];

  console.log('🚀 Starting batch onboarding...');

  const results = await Promise.allSettled(
    apis.map(async (api, index) => {
      return client.onboardAPI({
        path: api.path,
        upstream: api.upstream,
        required_subscription: api.subscription,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        api_keys: [{
          key: `${api.subscription}-key-${index + 1}`,
          name: `${api.subscription} Key ${index + 1}`,
          is_active: true
        }]
      });
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✅ ${apis[index].path}: ${result.value.message}`);
    } else {
      console.error(`❌ ${apis[index].path}:`, result.reason.message);
    }
  });
}

// Export examples for use in other files
export {
  basicOnboarding,
  keyManagement,
  apiUpdates,
  completeLifecycle,
  batchOperations
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('🎯 Running Veil SDK Examples...\n');
  
  async function runExamples() {
    await basicOnboarding();
    console.log('\n---\n');
    
    await keyManagement();
    console.log('\n---\n');
    
    await apiUpdates();
    console.log('\n---\n');
    
    await completeLifecycle();
    console.log('\n---\n');
    
    await batchOperations();
  }
  
  runExamples().catch(console.error);
}