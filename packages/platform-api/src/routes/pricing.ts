import { Elysia, t } from 'elysia';
import { pricingService } from '../services/pricing/pricing-service';
import {
  pricingModelQuerySchema,
  pricingModelParamsSchema,
  calculatePriceSchema,
  validatePromotionSchema,
  applyPromotionSchema,
  invoiceQuerySchema,
  invoiceParamsSchema,
  markInvoicePaidSchema,
  billingPeriodQuerySchema,
  currentBillingPeriodParamsSchema,
  upgradeSubscriptionSchema,
  upgradeSubscriptionParamsSchema,
  type PricingModelQuery,
  type PricingModelParams,
  type CalculatePriceRequest,
  type ValidatePromotionRequest,
  type ApplyPromotionRequest,
  type InvoiceQuery,
  type InvoiceParams,
  type MarkInvoicePaidRequest,
  type BillingPeriodQuery,
  type CurrentBillingPeriodParams,
  type UpgradeSubscriptionRequest,
  type UpgradeSubscriptionParams,
} from '../validation/pricing-validation';

export const pricingRoutes = new Elysia({ prefix: '/pricing' })

  /**
   * Get available pricing models
   * GET /api/v1/pricing/models
   */
  .get('/models', async ({ query, set }) => {
    try {
      const validatedQuery = pricingModelQuerySchema.parse(query);

      let models = await pricingService.getAvailablePricingModels();

      // Apply filters
      if (validatedQuery.type !== 'all') {
        models = models.filter(m => m.type === validatedQuery.type);
      }

      if (validatedQuery.billing_cycle !== 'all') {
        models = models.filter(m => m.billingCycle === validatedQuery.billing_cycle);
      }

      if (validatedQuery.is_active !== 'all') {
        const isActive = validatedQuery.is_active === 'true';
        models = models.filter(m => m.isActive === isActive);
      }

      // Apply pagination
      const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
      const endIndex = startIndex + validatedQuery.limit;
      const paginatedModels = models.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedModels,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: models.length,
          totalPages: Math.ceil(models.length / validatedQuery.limit),
          hasNext: endIndex < models.length,
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
        message: 'Failed to fetch pricing models',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  /**
   * Get specific pricing model by ID
   * GET /api/v1/pricing/models/:id
   */
  .get('/models/:id', async ({ params, set }) => {
    try {
      const { id } = pricingModelParamsSchema.parse(params);

      // Get all models and find the one with matching ID
      const models = await pricingService.getAvailablePricingModels();
      const model = models.find(m => m.id === id);

      if (!model) {
        set.status = 404;
        return {
          success: false,
          message: 'Pricing model not found'
        };
      }

      return {
        success: true,
        data: model,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch pricing model',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  /**
   * Calculate price for subscription usage
   * POST /api/v1/pricing/calculate
   */
  .post('/calculate', async ({ body, set }) => {
    try {
      const validatedData = calculatePriceSchema.parse(body);

      const result = await pricingService.calculateSubscriptionPrice(
        validatedData.usage.subscriptionId,
        validatedData.pricingModelId,
        validatedData.usage,
        validatedData.promotionCode
      );

      return {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Pricing model not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Pricing model not found'
          };
        }

        if (error.message === 'No active billing period found') {
          set.status = 400;
          return {
            success: false,
            message: 'No active billing period found for subscription'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to calculate price',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      apiUid: t.String({ format: 'uuid' }),
      pricingModelId: t.Integer({ minimum: 1 }),
      usage: t.Object({
        subscriptionId: t.Integer({ minimum: 1 }),
        totalRequests: t.Integer({ minimum: 0 }),
        successfulRequests: t.Integer({ minimum: 0 }),
        failedRequests: t.Integer({ minimum: 0 }),
        dataTransferredBytes: t.Integer({ minimum: 0 }),
        dataTransferredGB: t.Number({ minimum: 0 }),
      }),
      promotionCode: t.Optional(t.String({ minLength: 1, maxLength: 50 }))
    })
  })

  /**
   * Validate promotion code
   * POST /api/v1/pricing/promotions/validate
   */
  .post('/promotions/validate', async ({ body, set }) => {
    try {
      const validatedData = validatePromotionSchema.parse(body);

      const promotion = await pricingService.validatePromotionCode(validatedData.code);

      if (!promotion) {
        set.status = 404;
        return {
          success: false,
          message: 'Invalid or expired promotion code'
        };
      }

      return {
        success: true,
        data: promotion,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Promotion code')) {
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
        message: 'Failed to validate promotion code',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      code: t.String({ minLength: 1, maxLength: 50 })
    })
  })

  /**
   * Apply promotion code to subscription
   * POST /api/v1/pricing/promotions/apply
   */
  .post('/promotions/apply', async ({ body, set }) => {
    try {
      const validatedData = applyPromotionSchema.parse(body);

      // TODO: Get subscriptionId from subscriptionUid
      // For now, this is a placeholder - needs subscription service integration
      const subscriptionId = 1;

      const success = await pricingService.applyPromotionCode(subscriptionId, validatedData.code);

      return {
        success: true,
        message: 'Promotion code applied successfully',
        data: {
          subscriptionUid: validatedData.subscriptionUid,
          promotionCode: validatedData.code,
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid promotion code') {
          set.status = 404;
          return {
            success: false,
            message: 'Invalid promotion code'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to apply promotion code',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      subscriptionUid: t.String({ format: 'uuid' }),
      code: t.String({ minLength: 1, maxLength: 50 })
    })
  })

  /**
   * Get user's invoices
   * GET /api/v1/pricing/invoices
   */
  .get('/invoices', async ({ query, set }) => {
    try {
      // TODO: Get userId from JWT token
      const userId = 1;

      const validatedQuery = invoiceQuerySchema.parse(query);

      let invoices = await pricingService.getUserInvoices(userId, 100);

      // Apply filters
      if (validatedQuery.status !== 'all') {
        invoices = invoices.filter(inv => inv.status === validatedQuery.status);
      }

      if (validatedQuery.from_date) {
        const fromDate = new Date(validatedQuery.from_date);
        invoices = invoices.filter(inv => new Date(inv.issueDate) >= fromDate);
      }

      if (validatedQuery.to_date) {
        const toDate = new Date(validatedQuery.to_date);
        invoices = invoices.filter(inv => new Date(inv.issueDate) <= toDate);
      }

      if (validatedQuery.min_amount !== undefined) {
        invoices = invoices.filter(inv => inv.totalAmount >= validatedQuery.min_amount!);
      }

      if (validatedQuery.max_amount !== undefined) {
        invoices = invoices.filter(inv => inv.totalAmount <= validatedQuery.max_amount!);
      }

      // Apply sorting
      invoices.sort((a, b) => {
        let compareA, compareB;

        switch (validatedQuery.sort_by) {
          case 'amount':
            compareA = a.totalAmount;
            compareB = b.totalAmount;
            break;
          case 'due_date':
            compareA = new Date(a.dueDate).getTime();
            compareB = new Date(b.dueDate).getTime();
            break;
          case 'status':
            compareA = a.status;
            compareB = b.status;
            break;
          case 'issue_date':
          default:
            compareA = new Date(a.issueDate).getTime();
            compareB = new Date(b.issueDate).getTime();
            break;
        }

        if (validatedQuery.sort_order === 'desc') {
          return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
        } else {
          return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
        }
      });

      // Apply pagination
      const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
      const endIndex = startIndex + validatedQuery.limit;
      const paginatedInvoices = invoices.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedInvoices,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: invoices.length,
          totalPages: Math.ceil(invoices.length / validatedQuery.limit),
          hasNext: endIndex < invoices.length,
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
        message: 'Failed to fetch invoices',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  /**
   * Get specific invoice by ID
   * GET /api/v1/pricing/invoices/:id
   */
  .get('/invoices/:id', async ({ params, set }) => {
    try {
      const { id } = invoiceParamsSchema.parse(params);

      const invoice = await pricingService.getInvoice(id);

      if (!invoice) {
        set.status = 404;
        return {
          success: false,
          message: 'Invoice not found'
        };
      }

      return {
        success: true,
        data: invoice,
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  /**
   * Mark invoice as paid (placeholder - real payment processing should go through payment service)
   * POST /api/v1/pricing/invoices/:id/pay
   */
  .post('/invoices/:id/pay', async ({ params, body, set }) => {
    try {
      const { id } = invoiceParamsSchema.parse(params);
      const validatedData = markInvoicePaidSchema.parse(body);

      // TODO: This is a placeholder - real implementation should integrate with payment service
      // For now, just fetch the invoice to verify it exists
      const invoice = await pricingService.getInvoice(id);

      if (!invoice) {
        set.status = 404;
        return {
          success: false,
          message: 'Invoice not found'
        };
      }

      if (invoice.status === 'paid') {
        set.status = 400;
        return {
          success: false,
          message: 'Invoice is already paid'
        };
      }

      // TODO: Update invoice status to paid via repository
      // await pricingRepository.updateInvoiceStatus(id, 'paid', paidDate);

      return {
        success: true,
        message: 'Invoice payment recorded successfully (placeholder)',
        data: {
          invoiceId: id,
          status: 'paid',
          paidDate: validatedData.paidDate || new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to process invoice payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      paidDate: t.Optional(t.String()),
      paymentMethod: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      transactionId: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
      notes: t.Optional(t.String({ maxLength: 500 }))
    })
  })

  /**
   * Get billing periods for a subscription
   * GET /api/v1/pricing/billing-periods
   */
  .get('/billing-periods', async ({ query, set }) => {
    try {
      const validatedQuery = billingPeriodQuerySchema.parse(query);

      // TODO: Get billing periods from repository
      // const periods = await pricingRepository.findBillingPeriodsBySubscription(subscriptionId);

      return {
        success: true,
        message: 'Billing periods endpoint - implementation pending',
        data: [],
        meta: {
          timestamp: new Date().toISOString(),
          query: validatedQuery,
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch billing periods',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Note: Admin routes for pricing management (create/update pricing models and promotions)
// will be added to the admin routes file