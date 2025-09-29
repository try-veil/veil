import { Elysia } from 'elysia';

/**
 * Test utilities and helpers for E2E testing
 */

export interface TestUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  token?: string;
}

export interface TestAPI {
  id: number;
  uid: string;
  name: string;
  description: string;
  endpoint: string;
  baseUrl: string;
  version: string;
  price: number;
  pricingModel: string;
  categoryId: number;
  sellerId: number;
  isActive: boolean;
}

export interface TestApiKey {
  id: number;
  name: string;
  keyHash: string;
  userId: number;
  subscriptionId?: number;
  isActive: boolean;
}

export interface TestSubscription {
  id: number;
  userId: number;
  tier: string;
  isActive: boolean;
  quotaRequests?: number;
  quotaPeriod?: string;
  rateLimits?: string;
}

export class TestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  clearAuth(): void {
    delete this.defaultHeaders.Authorization;
  }

  async request(
    method: string,
    path: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options);
  }

  async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, undefined, headers);
  }

  async post(path: string, data?: any, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, data, headers);
  }

  async put(path: string, data?: any, headers?: Record<string, string>): Promise<Response> {
    return this.request('PUT', path, data, headers);
  }

  async patch(path: string, data?: any, headers?: Record<string, string>): Promise<Response> {
    return this.request('PATCH', path, data, headers);
  }

  async delete(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, undefined, headers);
  }
}

export class TestDatabase {
  static async createUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    // Mock implementation - in real tests, this would insert into database
    const user: TestUser = {
      id: Math.floor(Math.random() * 10000),
      email: userData.email || `test${Date.now()}@example.com`,
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      role: userData.role || 'user',
      ...userData,
    };

    return user;
  }

  static async createAdminUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createUser({ ...userData, role: 'admin' });
  }

  static async createAPI(apiData: Partial<TestAPI> = {}): Promise<TestAPI> {
    const api: TestAPI = {
      id: Math.floor(Math.random() * 10000),
      uid: apiData.uid || `api_${Date.now()}`,
      name: apiData.name || 'Test API',
      description: apiData.description || 'A test API for integration testing',
      endpoint: apiData.endpoint || '/test-api',
      baseUrl: apiData.baseUrl || 'https://api.example.com',
      version: apiData.version || '1.0.0',
      price: apiData.price || 0,
      pricingModel: apiData.pricingModel || 'free',
      categoryId: apiData.categoryId || 1,
      sellerId: apiData.sellerId || 1,
      isActive: apiData.isActive !== undefined ? apiData.isActive : false,
      ...apiData,
    };

    return api;
  }

  static async createApiKey(keyData: Partial<TestApiKey> = {}): Promise<TestApiKey> {
    const apiKey: TestApiKey = {
      id: Math.floor(Math.random() * 10000),
      name: keyData.name || 'Test API Key',
      keyHash: keyData.keyHash || `test_key_${Date.now()}`,
      userId: keyData.userId || 1,
      subscriptionId: keyData.subscriptionId,
      isActive: keyData.isActive !== undefined ? keyData.isActive : true,
      ...keyData,
    };

    return apiKey;
  }

  static async createSubscription(subData: Partial<TestSubscription> = {}): Promise<TestSubscription> {
    const subscription: TestSubscription = {
      id: Math.floor(Math.random() * 10000),
      userId: subData.userId || 1,
      tier: subData.tier || 'free',
      isActive: subData.isActive !== undefined ? subData.isActive : true,
      quotaRequests: subData.quotaRequests,
      quotaPeriod: subData.quotaPeriod || 'monthly',
      rateLimits: subData.rateLimits,
      ...subData,
    };

    return subscription;
  }

  static async cleanup(): Promise<void> {
    // Mock implementation - in real tests, this would clean up test data
    console.log('🧹 Cleaning up test database...');
  }
}

export function expectSuccessResponse(response: Response, expectedStatus: number = 200): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

export function expectErrorResponse(response: Response, expectedStatus: number = 400): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected error status ${expectedStatus}, got ${response.status}`);
  }
}

export async function expectJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON response, got ${contentType}`);
  }
  return response.json();
}

export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2)}@example.com`;
}

export function generateTestApiKey(): string {
  return `veil_test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Assertion helpers
export function assertValidResponse(data: any, expectedFields: string[]): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Response data is not an object');
  }

  if (!data.success) {
    throw new Error(`API returned error: ${data.message || 'Unknown error'}`);
  }

  for (const field of expectedFields) {
    if (!(field in data.data)) {
      throw new Error(`Missing expected field: ${field}`);
    }
  }
}

export function assertValidErrorResponse(data: any, expectedErrorCode?: string): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Response data is not an object');
  }

  if (data.success !== false) {
    throw new Error('Expected error response, but got success');
  }

  if (!data.error) {
    throw new Error('Missing error object in response');
  }

  if (expectedErrorCode && data.error.code !== expectedErrorCode) {
    throw new Error(`Expected error code ${expectedErrorCode}, got ${data.error.code}`);
  }
}

export function assertValidPagination(data: any): void {
  if (!data.pagination) {
    throw new Error('Missing pagination object');
  }

  const required = ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'];
  for (const field of required) {
    if (!(field in data.pagination)) {
      throw new Error(`Missing pagination field: ${field}`);
    }
  }
}

// Mock server helpers
export class MockCaddyServer {
  private static instance: MockCaddyServer;
  private responses: Map<string, any> = new Map();

  static getInstance(): MockCaddyServer {
    if (!MockCaddyServer.instance) {
      MockCaddyServer.instance = new MockCaddyServer();
    }
    return MockCaddyServer.instance;
  }

  mockOnboardAPI(response: any): void {
    this.responses.set('POST:/veil/api/routes', response);
  }

  mockUpdateAPI(response: any): void {
    this.responses.set('PUT:/veil/api/routes/*', response);
  }

  mockDeleteAPI(response: any): void {
    this.responses.set('DELETE:/veil/api/routes/*', response);
  }

  mockAddAPIKeys(response: any): void {
    this.responses.set('POST:/veil/api/keys', response);
  }

  getResponse(method: string, path: string): any {
    return this.responses.get(`${method}:${path}`);
  }

  clearMocks(): void {
    this.responses.clear();
  }
}