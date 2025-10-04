import { Elysia, t } from 'elysia';
import { PaymentService } from '../services/payment-service';
import {
  createPaymentSchema,
  processPaymentSchema,
  refundPaymentSchema,
  paymentQuerySchema,
  paymentParamsSchema,
  webhookSchema,
  paymentAnalyticsQuerySchema,
  pricingCalculationSchema,
  type CreatePaymentRequest,
  type ProcessPaymentRequest,
  type RefundPaymentRequest,
  type PaymentQuery,
  type PaymentParams,
  type WebhookEvent,
  type PaymentAnalyticsQuery,
  type PricingCalculationRequest
} from '../validation/payment-validation';

const paymentService = new PaymentService();

export const paymentRoutes = new Elysia({ prefix: '/payments' })
  // Calculate pricing for API subscription
  .post('/calculate-pricing', async ({ body, set }) => {
    try {
      const validatedData = pricingCalculationSchema.parse(body);
      
      const pricing = await paymentService.calculatePricing(
        validatedData.apiUid,
        validatedData.planType,
        validatedData.billingCycle,
        validatedData.requestsLimit,
        validatedData.discountCode,
        validatedData.quantity
      );

      return {
        success: true,
        data: pricing,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'API not found') {
          set.status = 404;
          return {
            success: false,
            message: 'API not found'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to calculate pricing',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      apiUid: t.String({ format: 'uuid' }),
      planType: t.Optional(t.Union([
        t.Literal('basic'),
        t.Literal('pro'),
        t.Literal('enterprise'),
        t.Literal('custom')
      ])),
      billingCycle: t.Optional(t.Union([
        t.Literal('monthly'),
        t.Literal('yearly'),
        t.Literal('one_time')
      ])),
      requestsLimit: t.Optional(t.Integer({ minimum: 1, maximum: 10000000 })),
      discountCode: t.Optional(t.String({ maxLength: 50 })),
      quantity: t.Optional(t.Integer({ minimum: 1 }))
    })
  })

  // Get user's payments
  .get('/', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = paymentQuerySchema.parse(query);
      
      const filters = {
        subscriptionId: undefined, // Will be set if subscription_uid provided
        status: validatedQuery.status !== 'all' ? validatedQuery.status : undefined,
        paymentProvider: validatedQuery.payment_provider !== 'all' ? validatedQuery.payment_provider : undefined,
        fromDate: validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined,
        toDate: validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined,
        minAmount: validatedQuery.min_amount,
        maxAmount: validatedQuery.max_amount,
      };

      let payments = await paymentService.getUserPayments(userId, filters);

      // Apply sorting
      if (validatedQuery.sort_by) {
        payments = payments.sort((a, b) => {
          let compareA, compareB;
          
          switch (validatedQuery.sort_by) {
            case 'amount':
              compareA = parseFloat(a.amount);
              compareB = parseFloat(b.amount);
              break;
            case 'status':
              compareA = a.status;
              compareB = b.status;
              break;
            case 'updated_at':
              compareA = new Date(a.updatedAt).getTime();
              compareB = new Date(b.updatedAt).getTime();
              break;
            case 'created_at':
            default:
              compareA = new Date(a.createdAt).getTime();
              compareB = new Date(b.createdAt).getTime();
              break;
          }

          if (validatedQuery.sort_order === 'desc') {
            return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
          } else {
            return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
          }
        });
      }

      // Apply pagination
      const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
      const endIndex = startIndex + validatedQuery.limit;
      const paginatedPayments = payments.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedPayments,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: payments.length,
          totalPages: Math.ceil(payments.length / validatedQuery.limit),
          hasNext: endIndex < payments.length,
          hasPrev: validatedQuery.page > 1,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch payments',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create payment intent
  .post('/', async ({ body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedData = createPaymentSchema.parse(body);
      const payment = await paymentService.createPayment(userId, validatedData);

      set.status = 201;
      return {
        success: true,
        message: 'Payment created successfully',
        data: payment,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Subscription not found'
          };
        }

        if (error.message === 'You can only create payments for your own subscriptions') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only create payments for your own subscriptions'
          };
        }

        if (error.message.includes('Payment provider') && error.message.includes('not supported')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to create payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      subscriptionUid: t.String({ format: 'uuid' }),
      amount: t.Number({ minimum: 0.01, maximum: 100000 }),
      currency: t.String({ minLength: 3, maxLength: 3 }),
      paymentMethod: t.Object({
        type: t.Union([
          t.Literal('card'),
          t.Literal('bank_account'),
          t.Literal('wallet'),
          t.Literal('crypto')
        ]),
        provider: t.Union([
          t.Literal('stripe'),
          t.Literal('paypal'),
          t.Literal('razorpay'),
          t.Literal('square'),
          t.Literal('coinbase')
        ]),
        details: t.Optional(t.Record(t.String(), t.Any()))
      }),
      description: t.Optional(t.String({ maxLength: 500 })),
      metadata: t.Optional(t.Record(t.String(), t.Any()))
    })
  })

  // Get payment by UID
  .get('/:uid', async ({ params, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = paymentParamsSchema.parse(params);
      const payment = await paymentService.getPayment(uid, userId);

      return {
        success: true,
        data: payment,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Payment not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Payment not found'
          };
        }

        if (error.message === 'You can only access your own payments') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own payments'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Process payment
  .post('/:uid/process', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = paymentParamsSchema.parse(params);
      const validatedData = processPaymentSchema.parse(body);
      
      // Update the payment record UID in the request
      const processRequest = {
        ...validatedData,
        paymentRecordUid: uid,
      };

      const payment = await paymentService.processPayment(userId, processRequest);

      return {
        success: true,
        message: 'Payment processed successfully',
        data: payment,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Payment not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Payment not found'
          };
        }

        if (error.message === 'You can only process your own payments') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only process your own payments'
          };
        }

        if (error.message === 'Payment is not in pending status') {
          set.status = 400;
          return {
            success: false,
            message: 'Payment is not in pending status'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to process payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      paymentToken: t.String({ minLength: 1 }),
      billingAddress: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        addressLine1: t.String({ minLength: 1 }),
        addressLine2: t.Optional(t.String()),
        city: t.String({ minLength: 1 }),
        state: t.String({ minLength: 1 }),
        postalCode: t.String({ minLength: 1 }),
        country: t.String({ minLength: 2, maxLength: 2 })
      }),
      savePaymentMethod: t.Optional(t.Boolean())
    })
  })

  // Refund payment
  .post('/:uid/refund', async ({ params, body, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const { uid } = paymentParamsSchema.parse(params);
      const validatedData = refundPaymentSchema.parse(body);
      
      // Update the payment record UID in the request
      const refundRequest = {
        ...validatedData,
        paymentRecordUid: uid,
      };

      const payment = await paymentService.refundPayment(userId, refundRequest);

      return {
        success: true,
        message: 'Payment refunded successfully',
        data: payment,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Payment not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Payment not found'
          };
        }

        if (error.message === 'You can only refund your own payments') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only refund your own payments'
          };
        }

        if (error.message === 'Only completed payments can be refunded') {
          set.status = 400;
          return {
            success: false,
            message: 'Only completed payments can be refunded'
          };
        }

        if (error.message.includes('Refund amount cannot exceed')) {
          set.status = 400;
          return {
            success: false,
            message: error.message
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to process refund',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      amount: t.Optional(t.Number({ minimum: 0.01, maximum: 100000 })),
      reason: t.String({ minLength: 1, maxLength: 500 }),
      notifyCustomer: t.Optional(t.Boolean())
    })
  })

  // Get payment analytics
  .get('/analytics/overview', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      const validatedQuery = paymentAnalyticsQuerySchema.parse(query);
      
      const fromDate = validatedQuery.from_date ? new Date(validatedQuery.from_date) : undefined;
      const toDate = validatedQuery.to_date ? new Date(validatedQuery.to_date) : undefined;

      const analytics = await paymentService.getPaymentAnalytics(userId, fromDate, toDate);

      return {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch payment analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Webhook endpoint for payment providers
  .post('/webhook/:provider', async ({ params, body, headers, set, request }) => {
    try {
      const { provider } = params;

      if (!['stripe', 'paypal', 'razorpay', 'square', 'coinbase'].includes(provider)) {
        set.status = 400;
        return {
          success: false,
          message: 'Unsupported payment provider'
        };
      }

      // Get signature from headers (provider-specific)
      let signature = '';
      if (provider === 'razorpay') {
        signature = headers['x-razorpay-signature'] || '';
      } else if (provider === 'stripe') {
        signature = headers['stripe-signature'] || '';
      } else if (provider === 'paypal') {
        signature = headers['paypal-transmission-sig'] || '';
      } else {
        signature = headers['x-webhook-signature'] || '';
      }

      if (!signature) {
        console.warn(`No signature found for ${provider} webhook`);
      }

      // For Razorpay, we need to pass the raw body string for signature verification
      // Elysia already parses the body, so we'll pass the stringified version
      const webhookPayload = provider === 'razorpay' ? JSON.stringify(body) : body;

      await paymentService.handleWebhook(provider, webhookPayload, signature);

      return {
        success: true,
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      console.error('Webhook processing error:', error);

      if (error instanceof Error && error.message === 'Invalid webhook signature') {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid webhook signature'
        };
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to process webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get payment methods (placeholder for future implementation)
  .get('/methods', async ({ set }) => {
    try {
      // TODO: Get userId from JWT token - for now using placeholder
      const userId = 1; // This should come from authenticated user context
      
      // Mock payment methods - in real implementation, fetch from payment provider
      const paymentMethods = [
        {
          id: 'pm_1234567890',
          type: 'card',
          provider: 'stripe',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
          billingAddress: {
            name: 'John Doe',
            country: 'US'
          },
          createdAt: new Date().toISOString(),
        }
      ];

      return {
        success: true,
        data: paymentMethods,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch payment methods',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create invoice (placeholder for future implementation)
  .post('/invoices', async ({ body, set }) => {
    try {
      // TODO: Implement invoice generation
      // This would integrate with invoicing services like Invoice Ninja, FreshBooks, etc.
      
      return {
        success: true,
        message: 'Invoice generation feature coming soon',
        data: {
          invoiceId: 'INV-' + Date.now(),
          status: 'draft',
          url: 'https://example.com/invoices/123'
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to create invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Note: Admin routes for payment management will be added to admin routes