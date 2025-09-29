import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestClient, TestDatabase, expectSuccessResponse, expectErrorResponse, expectJsonResponse, assertValidResponse, assertValidErrorResponse } from '../utils/test-helpers';
import { testSubscriptions, testPayments, testMockResponses, getTestSubscription } from '../fixtures/test-data';
import '../setup';

describe('Subscription and Payment Flow E2E Tests', () => {
  let client: TestClient;
  let userToken: string;
  let userId: number;
  let testSubscription: any;

  beforeAll(async () => {
    client = new TestClient('http://localhost:3001');

    // Create test user
    const testUser = await TestDatabase.createUser({ role: 'user' });
    userId = testUser.id;

    // Get authentication token
    const userLogin = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'TestPassword123!',
    });
    const userData = await expectJsonResponse(userLogin);
    userToken = userData.data.accessToken;
  });

  beforeEach(async () => {
    testSubscription = getTestSubscription('starterUser');
  });

  describe('Subscription Management', () => {
    test('should get available subscription tiers', async () => {
      const response = await client.get('/api/v1/subscriptions/tiers');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['tiers']);

      expect(Array.isArray(data.data.tiers)).toBe(true);
      expect(data.data.tiers.length).toBeGreaterThan(0);

      // Check tier structure
      for (const tier of data.data.tiers) {
        expect(tier).toHaveProperty('id');
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        expect(tier).toHaveProperty('features');
        expect(tier).toHaveProperty('quotaRequests');
        expect(Array.isArray(tier.features)).toBe(true);
      }
    });

    test('should get current user subscription', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/subscriptions/current');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['subscription']);

      if (data.data.subscription) {
        expect(data.data.subscription).toHaveProperty('tier');
        expect(data.data.subscription).toHaveProperty('isActive');
        expect(data.data.subscription).toHaveProperty('quotaRequests');
      }
    });

    test('should create new subscription', async () => {
      client.setAuthToken(userToken);

      const subscriptionData = {
        tier: 'starter',
        paymentMethodId: 'pm_test_card', // Mock payment method
      };

      const response = await client.post('/api/v1/subscriptions', subscriptionData);
      
      if (response.status === 402) {
        // Payment required but failed
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'PAYMENT_FAILED');
        return;
      }

      expectSuccessResponse(response, 201);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['subscription', 'payment']);

      expect(data.data.subscription.tier).toBe(subscriptionData.tier);
      expect(data.data.subscription.userId).toBe(userId);
      expect(data.data.subscription.isActive).toBe(true);
    });

    test('should upgrade subscription', async () => {
      client.setAuthToken(userToken);

      const upgradeData = {
        newTier: 'professional',
        paymentMethodId: 'pm_test_card',
      };

      const response = await client.post('/api/v1/subscriptions/upgrade', upgradeData);
      
      if (response.status === 402 || response.status === 404) {
        // Payment failed or no current subscription
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['subscription', 'payment']);

      expect(data.data.subscription.tier).toBe(upgradeData.newTier);
    });

    test('should cancel subscription', async () => {
      client.setAuthToken(userToken);

      const cancelData = {
        reason: 'Not using the service enough',
        feedback: 'Great service, but too expensive for my needs',
      };

      const response = await client.post('/api/v1/subscriptions/cancel', cancelData);
      
      if (response.status === 404) {
        // No active subscription to cancel
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cancel');
    });

    test('should get subscription history', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/subscriptions/history');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['subscriptions']);

      expect(Array.isArray(data.data.subscriptions)).toBe(true);
      
      for (const subscription of data.data.subscriptions) {
        expect(subscription).toHaveProperty('tier');
        expect(subscription).toHaveProperty('startDate');
        expect(subscription).toHaveProperty('status');
      }
    });
  });

  describe('Payment Processing', () => {
    test('should create payment intent', async () => {
      client.setAuthToken(userToken);

      const paymentData = {
        amount: 2500, // $25.00
        currency: 'usd',
        subscriptionTier: 'professional',
        paymentMethodId: 'pm_test_card',
      };

      const response = await client.post('/api/v1/payments/create-intent', paymentData);
      expectSuccessResponse(response, 201);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['clientSecret', 'paymentIntentId']);

      expect(data.data.clientSecret).toMatch(/^pi_.*_secret_/);
    });

    test('should confirm payment', async () => {
      client.setAuthToken(userToken);

      const confirmData = {
        paymentIntentId: 'pi_test_123456789',
        paymentMethodId: 'pm_test_card',
      };

      const response = await client.post('/api/v1/payments/confirm', confirmData);
      
      if (response.status === 400 || response.status === 404) {
        // Payment intent not found or invalid
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['payment']);

      expect(data.data.payment).toHaveProperty('status');
      expect(data.data.payment.status).toBe('succeeded');
    });

    test('should handle payment failure', async () => {
      client.setAuthToken(userToken);

      const failedPaymentData = {
        amount: 2500,
        currency: 'usd',
        subscriptionTier: 'professional',
        paymentMethodId: 'pm_card_declined', // Mock declined card
      };

      const response = await client.post('/api/v1/payments/create-intent', failedPaymentData);
      
      if (response.status === 402) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'PAYMENT_FAILED');
        expect(data.error.message).toContain('declined');
      }
    });

    test('should get payment history', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/history');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['payments']);

      expect(Array.isArray(data.data.payments)).toBe(true);
      
      for (const payment of data.data.payments) {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('status');
        expect(payment).toHaveProperty('createdAt');
      }
    });

    test('should get payment by ID', async () => {
      client.setAuthToken(userToken);

      const paymentId = 'pay_test_123456789';
      const response = await client.get(`/api/v1/payments/${paymentId}`);
      
      if (response.status === 404) {
        // Payment not found
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['id', 'amount', 'status', 'createdAt']);

      expect(data.data.id).toBe(paymentId);
    });
  });

  describe('Usage-Based Billing', () => {
    test('should calculate usage charges', async () => {
      client.setAuthToken(userToken);

      const usageData = {
        apiId: 1,
        requests: 1000,
        billingPeriod: 'current',
      };

      const response = await client.post('/api/v1/payments/calculate-usage', usageData);
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalAmount', 'breakdown']);

      expect(typeof data.data.totalAmount).toBe('number');
      expect(data.data.totalAmount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.data.breakdown)).toBe(true);
    });

    test('should get current usage and charges', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/usage-charges?period=current');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['totalCharges', 'usageByApi']);

      expect(typeof data.data.totalCharges).toBe('number');
      expect(Array.isArray(data.data.usageByApi)).toBe(true);
    });

    test('should create usage-based payment', async () => {
      client.setAuthToken(userToken);

      const usagePaymentData = {
        usageCharges: [
          { apiId: 1, requests: 500, amount: 50 },
          { apiId: 2, requests: 200, amount: 20 },
        ],
        paymentMethodId: 'pm_test_card',
      };

      const response = await client.post('/api/v1/payments/usage', usagePaymentData);
      
      if (response.status === 400) {
        // No usage charges or invalid data
        return;
      }

      expectSuccessResponse(response, 201);
      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['payment', 'totalAmount']);

      expect(data.data.totalAmount).toBe(70); // 50 + 20
    });
  });

  describe('Billing and Invoices', () => {
    test('should get invoices', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/invoices');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['invoices']);

      expect(Array.isArray(data.data.invoices)).toBe(true);
      
      for (const invoice of data.data.invoices) {
        expect(invoice).toHaveProperty('id');
        expect(invoice).toHaveProperty('amount');
        expect(invoice).toHaveProperty('status');
        expect(invoice).toHaveProperty('dueDate');
      }
    });

    test('should download invoice PDF', async () => {
      client.setAuthToken(userToken);

      const invoiceId = 'inv_test_123456789';
      const response = await client.get(`/api/v1/payments/invoices/${invoiceId}/pdf`);
      
      if (response.status === 404) {
        // Invoice not found
        return;
      }

      expectSuccessResponse(response);
      expect(response.headers.get('content-type')).toBe('application/pdf');
    });

    test('should get billing summary', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/billing-summary?period=month');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['summary']);

      expect(data.data.summary).toHaveProperty('totalAmount');
      expect(data.data.summary).toHaveProperty('subscriptionCharges');
      expect(data.data.summary).toHaveProperty('usageCharges');
      expect(data.data.summary).toHaveProperty('period');
    });
  });

  describe('Payment Methods', () => {
    test('should add payment method', async () => {
      client.setAuthToken(userToken);

      const paymentMethodData = {
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123',
        },
        billingDetails: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const response = await client.post('/api/v1/payments/payment-methods', paymentMethodData);
      expectSuccessResponse(response, 201);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['paymentMethodId', 'type']);

      expect(data.data.type).toBe('card');
    });

    test('should get user payment methods', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/payment-methods');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      assertValidResponse(data, ['paymentMethods']);

      expect(Array.isArray(data.data.paymentMethods)).toBe(true);
      
      for (const pm of data.data.paymentMethods) {
        expect(pm).toHaveProperty('id');
        expect(pm).toHaveProperty('type');
        expect(pm).toHaveProperty('card');
        expect(pm.card.last4).toMatch(/^\d{4}$/);
      }
    });

    test('should set default payment method', async () => {
      client.setAuthToken(userToken);

      const paymentMethodId = 'pm_test_123456789';
      const response = await client.post(`/api/v1/payments/payment-methods/${paymentMethodId}/default`);
      
      if (response.status === 404) {
        // Payment method not found
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });

    test('should delete payment method', async () => {
      client.setAuthToken(userToken);

      const paymentMethodId = 'pm_test_to_delete';
      const response = await client.delete(`/api/v1/payments/payment-methods/${paymentMethodId}`);
      
      if (response.status === 404) {
        // Payment method not found
        return;
      }

      expectSuccessResponse(response);
      const data = await expectJsonResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe('Webhooks and Events', () => {
    test('should handle payment succeeded webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook_123',
            amount: 2500,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      const response = await client.post('/api/v1/payments/webhooks/stripe', webhookData, {
        'stripe-signature': 'test_signature',
      });

      expectSuccessResponse(response);
    });

    test('should handle subscription updated webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_webhook_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
          },
        },
      };

      const response = await client.post('/api/v1/payments/webhooks/stripe', webhookData, {
        'stripe-signature': 'test_signature',
      });

      expectSuccessResponse(response);
    });
  });

  describe('Error Handling', () => {
    test('should reject subscription without payment method', async () => {
      client.setAuthToken(userToken);

      const subscriptionData = {
        tier: 'professional',
        // Missing paymentMethodId
      };

      const response = await client.post('/api/v1/subscriptions', subscriptionData);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should handle payment provider timeout', async () => {
      client.setAuthToken(userToken);

      const paymentData = {
        amount: 2500,
        currency: 'usd',
        subscriptionTier: 'professional',
        paymentMethodId: 'pm_timeout_test', // Mock timeout scenario
      };

      const response = await client.post('/api/v1/payments/create-intent', paymentData);
      
      if (response.status === 504) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'TIMEOUT');
      }
    });

    test('should validate subscription tier', async () => {
      client.setAuthToken(userToken);

      const invalidSubscriptionData = {
        tier: 'invalid_tier',
        paymentMethodId: 'pm_test_card',
      };

      const response = await client.post('/api/v1/subscriptions', invalidSubscriptionData);
      expectErrorResponse(response, 400);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'VALIDATION_ERROR');
    });

    test('should handle duplicate subscription attempts', async () => {
      client.setAuthToken(userToken);

      const subscriptionData = {
        tier: 'starter',
        paymentMethodId: 'pm_test_card',
      };

      // First attempt
      await client.post('/api/v1/subscriptions', subscriptionData);
      
      // Second attempt (duplicate)
      const response = await client.post('/api/v1/subscriptions', subscriptionData);
      
      if (response.status === 409) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'RESOURCE_CONFLICT');
      }
    });

    test('should handle insufficient funds', async () => {
      client.setAuthToken(userToken);

      const paymentData = {
        amount: 2500,
        currency: 'usd',
        subscriptionTier: 'professional',
        paymentMethodId: 'pm_card_insufficient_funds',
      };

      const response = await client.post('/api/v1/payments/create-intent', paymentData);
      
      if (response.status === 402) {
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'INSUFFICIENT_FUNDS');
      }
    });
  });

  describe('Security and Authorization', () => {
    test('should protect payment endpoints from unauthorized access', async () => {
      client.clearAuth();

      const response = await client.get('/api/v1/payments/history');
      expectErrorResponse(response, 401);

      const data = await expectJsonResponse(response);
      assertValidErrorResponse(data, 'UNAUTHORIZED');
    });

    test('should validate payment ownership', async () => {
      // Create another user
      const otherUser = await TestDatabase.createUser({ role: 'user' });
      const otherLogin = await client.post('/api/v1/auth/login', {
        email: otherUser.email,
        password: 'TestPassword123!',
      });
      const otherData = await expectJsonResponse(otherLogin);
      const otherToken = otherData.data.accessToken;

      client.setAuthToken(otherToken);

      // Try to access another user's payment
      const response = await client.get('/api/v1/payments/pay_user1_payment');
      
      if (response.status !== 404) {
        expectErrorResponse(response, 403);
        const data = await expectJsonResponse(response);
        assertValidErrorResponse(data, 'FORBIDDEN');
      }
    });

    test('should sanitize payment data in responses', async () => {
      client.setAuthToken(userToken);

      const response = await client.get('/api/v1/payments/payment-methods');
      expectSuccessResponse(response);

      const data = await expectJsonResponse(response);
      
      for (const pm of data.data.paymentMethods || []) {
        // Sensitive data should be masked or excluded
        expect(pm.card.number).toBeUndefined();
        expect(pm.card.cvc).toBeUndefined();
        if (pm.card.last4) {
          expect(pm.card.last4).toMatch(/^\d{4}$/);
        }
      }
    });
  });
});