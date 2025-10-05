import { Elysia, t } from 'elysia';
import { PaymentService } from '../services/payment-service';
import { authMiddleware } from '../middleware/auth';

const paymentService = new PaymentService();

export const paymentRoutes = new Elysia({ prefix: '/payments' })
  .use(authMiddleware)
  .post(
    '/create',
    async ({ body, user }) => {
      const payment = await paymentService.createPayment({
        userId: user.userId,
        amount: body.amount,
        currency: body.currency || 'INR',
        provider: body.provider || 'razorpay',
        description: body.description,
        metadata: body.metadata,
      });

      return {
        success: true,
        data: payment,
      };
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 1 }),
        currency: t.Optional(t.String()),
        provider: t.Optional(t.String()),
        description: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Create a payment order',
        description: 'Create a new payment order/intent with the payment provider',
      },
    }
  )
  .post(
    '/process',
    async ({ body, user }) => {
      const result = await paymentService.processPayment({
        paymentUid: body.paymentUid,
        paymentToken: body.paymentToken,
        razorpaySignature: body.razorpaySignature,
        razorpayOrderId: body.razorpayOrderId,
      });

      return {
        success: result.success,
        data: result,
      };
    },
    {
      body: t.Object({
        paymentUid: t.String(),
        paymentToken: t.String(),
        razorpaySignature: t.Optional(t.String()),
        razorpayOrderId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Process/verify a payment',
        description: 'Verify and complete a payment after user authorization',
      },
    }
  )
  .post(
    '/refund',
    async ({ body, user }) => {
      const refund = await paymentService.refundPayment({
        paymentUid: body.paymentUid,
        amount: body.amount,
        reason: body.reason,
      });

      return {
        success: true,
        data: refund,
      };
    },
    {
      body: t.Object({
        paymentUid: t.String(),
        amount: t.Optional(t.Number()),
        reason: t.String(),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Refund a payment',
        description: 'Process a full or partial refund for a completed payment',
      },
    }
  )
  .get(
    '/:paymentUid',
    async ({ params, user }) => {
      const payment = await paymentService.getPayment(params.paymentUid, user.userId);

      return {
        success: true,
        data: payment,
      };
    },
    {
      params: t.Object({
        paymentUid: t.String(),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Get payment details',
        description: 'Retrieve details of a specific payment',
      },
    }
  )
  .get(
    '/:paymentUid/status',
    async ({ params, user }) => {
      const status = await paymentService.getPaymentStatus(params.paymentUid);

      return {
        success: true,
        data: status,
      };
    },
    {
      params: t.Object({
        paymentUid: t.String(),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Get payment status from provider',
        description: 'Get real-time payment status from the payment provider',
      },
    }
  )
  .get(
    '/',
    async ({ query, user }) => {
      const payments = await paymentService.getUserPayments(
        user.userId,
        query.limit || 50,
        query.offset || 0
      );

      return {
        success: true,
        data: payments,
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Get user payments',
        description: 'List all payments for the authenticated user',
      },
    }
  )
  .get(
    '/analytics/summary',
    async ({ query, user }) => {
      const analytics = await paymentService.getAnalytics(
        user.userId,
        query.fromDate ? new Date(query.fromDate) : undefined,
        query.toDate ? new Date(query.toDate) : undefined
      );

      return {
        success: true,
        data: analytics,
      };
    },
    {
      query: t.Object({
        fromDate: t.Optional(t.String()),
        toDate: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Get payment analytics',
        description: 'Get payment analytics and statistics for the user',
      },
    }
  );
