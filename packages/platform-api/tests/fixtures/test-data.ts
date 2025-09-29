/**
 * Test fixtures and sample data for integration tests
 */

export const testUsers = {
  regularUser: {
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'SecurePass123!',
    role: 'user',
  },
  
  adminUser: {
    email: 'admin@veil.com',
    firstName: 'Admin',
    lastName: 'User',
    password: 'AdminPass123!',
    role: 'admin',
  },
  
  sellerUser: {
    email: 'seller@example.com',
    firstName: 'API',
    lastName: 'Seller',
    password: 'SellerPass123!',
    role: 'seller',
  },
};

export const testAPIs = {
  weatherAPI: {
    name: 'Weather API',
    description: 'Get current weather information for any location',
    version: '1.0.0',
    endpoint: '/weather',
    baseUrl: 'https://api.weatherservice.com',
    price: 0.001,
    pricingModel: 'per_request',
    documentation: 'https://docs.weatherservice.com',
    testEndpoint: 'https://api.weatherservice.com/test',
    requiredHeaders: ['X-API-Key'],
    allowedMethods: ['GET', 'POST'],
    tags: ['weather', 'climate', 'forecast'],
  },
  
  geoAPI: {
    name: 'Geolocation API',
    description: 'Geocoding and reverse geocoding services',
    version: '2.1.0',
    endpoint: '/geo',
    baseUrl: 'https://api.geoservice.com',
    price: 0,
    pricingModel: 'free',
    documentation: 'https://docs.geoservice.com',
    testEndpoint: 'https://api.geoservice.com/health',
    requiredHeaders: [],
    allowedMethods: ['GET'],
    tags: ['geography', 'maps', 'coordinates'],
  },
  
  paymentAPI: {
    name: 'Payment Processing API',
    description: 'Secure payment processing and transaction management',
    version: '3.2.1',
    endpoint: '/payments',
    baseUrl: 'https://api.paymentpro.com',
    price: 25.00,
    pricingModel: 'monthly',
    documentation: 'https://docs.paymentpro.com',
    testEndpoint: 'https://api.paymentpro.com/ping',
    requiredHeaders: ['Authorization', 'X-Merchant-ID'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    tags: ['payments', 'transactions', 'finance'],
  },
};

export const testCategories = {
  weather: {
    name: 'Weather & Climate',
    description: 'APIs for weather data, forecasts, and climate information',
  },
  
  geography: {
    name: 'Geography & Maps',
    description: 'Location services, geocoding, and mapping APIs',
  },
  
  finance: {
    name: 'Finance & Payments',
    description: 'Financial data, payment processing, and transaction APIs',
  },
  
  social: {
    name: 'Social Media',
    description: 'Social network integration and social data APIs',
  },
  
  utilities: {
    name: 'Utilities',
    description: 'General utility APIs for common tasks',
  },
};

export const testSubscriptions = {
  freeUser: {
    tier: 'free',
    quotaRequests: 1000,
    quotaPeriod: 'monthly',
    rateLimits: JSON.stringify([
      { requests: 10, window: 60 }, // 10 requests per minute
      { requests: 1000, window: 86400 }, // 1000 requests per day
    ]),
  },
  
  starterUser: {
    tier: 'starter',
    quotaRequests: 10000,
    quotaPeriod: 'monthly',
    rateLimits: JSON.stringify([
      { requests: 50, window: 60 }, // 50 requests per minute
      { requests: 10000, window: 86400 }, // 10000 requests per day
    ]),
  },
  
  proUser: {
    tier: 'professional',
    quotaRequests: 100000,
    quotaPeriod: 'monthly',
    rateLimits: JSON.stringify([
      { requests: 200, window: 60 }, // 200 requests per minute
      { requests: 100000, window: 86400 }, // 100000 requests per day
    ]),
  },
  
  enterpriseUser: {
    tier: 'enterprise',
    quotaRequests: null, // unlimited
    quotaPeriod: 'monthly',
    rateLimits: JSON.stringify([
      { requests: 1000, window: 60 }, // 1000 requests per minute
    ]),
  },
};

export const testApiKeys = {
  primary: {
    name: 'Primary API Key',
    permissions: ['read', 'write'],
  },
  
  readonly: {
    name: 'Read-Only Key',
    permissions: ['read'],
  },
  
  testing: {
    name: 'Testing Key',
    permissions: ['read', 'write', 'test'],
  },
};

export const testApprovalRequests = {
  apiSubmission: {
    type: 'api_submission',
    entityType: 'api',
    priority: 'medium',
    reason: 'Submitting new Weather API for marketplace inclusion',
    data: {
      documentation: 'https://docs.weatherservice.com',
      testEndpoints: ['https://api.weatherservice.com/test'],
      supportEmail: 'support@weatherservice.com',
    },
    tags: ['weather', 'new-api'],
  },
  
  providerRegistration: {
    type: 'provider_registration',
    entityType: 'user',
    priority: 'high',
    reason: 'Registering as API provider to sell weather services',
    data: {
      companyInfo: {
        name: 'Weather Services Inc.',
        website: 'https://weatherservice.com',
        contactPerson: 'John Smith',
        phone: '+1-555-0123',
      },
      businessDocuments: ['business-license.pdf', 'tax-id.pdf'],
    },
    tags: ['provider', 'registration'],
  },
  
  refundRequest: {
    type: 'refund_request',
    entityType: 'payment',
    priority: 'high',
    reason: 'Service was not working as advertised, requesting full refund',
    data: {
      refundAmount: 25.00,
      originalPaymentId: 'pay_123456789',
      issues: ['API downtime', 'Incorrect data', 'Missing features'],
    },
    attachments: ['error-screenshots.zip'],
    tags: ['refund', 'service-issue'],
  },
};

export const testPayments = {
  monthlySubscription: {
    amount: 2500, // $25.00 in cents
    currency: 'usd',
    description: 'Monthly Professional Subscription',
    metadata: {
      subscriptionTier: 'professional',
      billingPeriod: 'monthly',
    },
  },
  
  perRequestPayment: {
    amount: 100, // $1.00 in cents
    currency: 'usd',
    description: 'Pay-per-request API usage',
    metadata: {
      apiId: '123',
      requestCount: 1000,
    },
  },
};

export const testAnalytics = {
  usageData: {
    timeframe: 'day',
    data: [
      { timestamp: '2024-01-01T00:00:00Z', requests: 150, errors: 2 },
      { timestamp: '2024-01-01T01:00:00Z', requests: 230, errors: 1 },
      { timestamp: '2024-01-01T02:00:00Z', requests: 180, errors: 0 },
    ],
  },
  
  revenueData: {
    timeframe: 'month',
    data: [
      { period: '2024-01', revenue: 1250.00, apiCount: 15 },
      { period: '2024-02', revenue: 1890.50, apiCount: 18 },
      { period: '2024-03', revenue: 2150.75, apiCount: 22 },
    ],
  },
};

export const testMockResponses = {
  caddyOnboardSuccess: {
    status: 'success',
    message: 'API successfully onboarded',
    data: {
      path: '/weather/*',
      upstream: 'https://api.weatherservice.com',
      required_subscription: 'api_123',
      methods: ['GET', 'POST'],
    },
  },
  
  caddyOnboardError: {
    status: 'error',
    message: 'Failed to onboard API',
    error: 'Upstream service not reachable',
  },
  
  paymentProviderSuccess: {
    id: 'pay_123456789',
    status: 'succeeded',
    amount: 2500,
    currency: 'usd',
    created: 1640995200,
  },
  
  paymentProviderError: {
    error: {
      type: 'card_error',
      code: 'card_declined',
      message: 'Your card was declined.',
    },
  },
};

export const testValidationCases = {
  validEmail: 'user@example.com',
  invalidEmails: ['invalid-email', '@domain.com', 'user@', 'user.domain.com'],
  
  validPassword: 'SecurePassword123!',
  invalidPasswords: ['short', 'nouppercase123!', 'NOLOWERCASE123!', 'NoNumbers!', 'NoSpecialChars123'],
  
  validUrl: 'https://api.example.com',
  invalidUrls: ['not-a-url', 'ftp://example.com', 'http://', 'https://'],
  
  validUuid: '550e8400-e29b-41d4-a716-446655440000',
  invalidUuids: ['not-a-uuid', '123', '550e8400-e29b-41d4-a716'],
};

export const testErrorScenarios = {
  authenticationFailure: {
    scenarios: [
      { name: 'No token provided', token: null, expectedStatus: 401 },
      { name: 'Invalid token format', token: 'invalid-token', expectedStatus: 401 },
      { name: 'Expired token', token: 'expired.jwt.token', expectedStatus: 401 },
    ],
  },
  
  validationFailure: {
    scenarios: [
      { name: 'Missing required fields', data: {}, expectedStatus: 400 },
      { name: 'Invalid email format', data: { email: 'invalid' }, expectedStatus: 400 },
      { name: 'Password too short', data: { password: '123' }, expectedStatus: 400 },
    ],
  },
  
  rateLimiting: {
    scenarios: [
      { name: 'Rate limit exceeded', expectedStatus: 429 },
      { name: 'Quota exceeded', expectedStatus: 429 },
    ],
  },
};

// Helper function to get test data with variations
export function getTestUser(variation: keyof typeof testUsers = 'regularUser') {
  return { ...testUsers[variation] };
}

export function getTestAPI(variation: keyof typeof testAPIs = 'weatherAPI') {
  return { ...testAPIs[variation] };
}

export function getTestCategory(variation: keyof typeof testCategories = 'weather') {
  return { ...testCategories[variation] };
}

export function getTestSubscription(variation: keyof typeof testSubscriptions = 'freeUser') {
  return { ...testSubscriptions[variation] };
}