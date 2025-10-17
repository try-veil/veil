import { Elysia, t } from 'elysia';
import { PaymentService } from '../services/payment-service';
import { jwt } from '@elysiajs/jwt';
import { config } from '../config';

const paymentService = new PaymentService();

// Helper to extract and verify user from JWT
async function authenticateRequest(request: any, jwtPlugin: any, set: any) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    set.status = 401;
    return { error: { success: false, error: 'Missing authorization token' }, user: null };
  }

  const token = authHeader.substring(7);
  const user = await jwtPlugin.verify(token);

  if (!user) {
    set.status = 401;
    return { error: { success: false, error: 'Invalid token' }, user: null };
  }

  return { error: null, user };
}

export const paymentRoutes = new Elysia({ prefix: '/payments' })
  .use(jwt({ name: 'jwt', secret: config.jwt.secret }))
  .post(
    '/create',
    async ({ body, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

      const payment = await paymentService.createPayment({
        userId: (user as any).userId || (user as any).id,
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
    async ({ body, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

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
    async ({ body, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

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
    async ({ params, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

      const payment = await paymentService.getPayment(params.paymentUid, (user as any).userId || (user as any).id);

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
    async ({ params, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

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
    async ({ query, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

      const payments = await paymentService.getUserPayments(
        (user as any).userId || (user as any).id,
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
    async ({ query, jwt: jwtPlugin, set, request }: any) => {
      const { error, user } = await authenticateRequest(request, jwtPlugin, set);
      if (error) return error;

      const analytics = await paymentService.getAnalytics(
        (user as any).userId || (user as any).id,
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
