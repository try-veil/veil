import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth';
import { creditPurchaseService } from '../../services/credit-purchase-service';

export const creditPurchaseRoutes = new Elysia({ prefix: '/api/v1/credits' })
  .use(authMiddleware)
  .post('/purchase', async ({ user, body }) => {
    const result = await creditPurchaseService.initiatePurchase(user.id, body.packageUid);
    return {
      success: true,
      data: result,
    };
  }, {
    body: t.Object({
      packageUid: t.String(),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Purchase credit package',
      description: 'Initiate purchase of a credit package',
    },
  })
  .post('/purchase/custom', async ({ user, body }) => {
    const result = await creditPurchaseService.initiatePurchaseCustomAmount(user.id, body.amount);
    return {
      success: true,
      data: result,
    };
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 1 }),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Purchase custom credit amount',
      description: 'Initiate purchase of a custom credit amount',
    },
  })
  .get('/purchases', async ({ user }) => {
    const purchases = await creditPurchaseService.getPurchases(user.id);
    return {
      success: true,
      data: purchases,
    };
  }, {
    detail: {
      tags: ['Credits'],
      summary: 'List credit purchases',
      description: 'Get user\'s credit purchase history',
    },
  })
  .get('/purchases/:uid', async ({ params, user }) => {
    const purchase = await creditPurchaseService.getPurchase(params.uid);

    // TODO: Verify ownership
    return {
      success: true,
      data: purchase,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Get purchase details',
      description: 'Get details of a specific credit purchase',
    },
  });
