import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth';
import { creditPurchaseService } from '../../services/credit-purchase-service';

export const creditPackageRoutes = new Elysia({ prefix: '/api/v1/credits' })
  .use(authMiddleware)
  .get('/packages', async () => {
    const packages = await creditPurchaseService.getPackages();
    return {
      success: true,
      data: packages,
    };
  }, {
    detail: {
      tags: ['Credits'],
      summary: 'List credit packages',
      description: 'Get all available credit packages for purchase',
    },
  })
  .get('/packages/:uid', async ({ params }) => {
    const pkg = await creditPurchaseService.getPackage(params.uid);
    return {
      success: true,
      data: pkg,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Credits'],
      summary: 'Get package details',
      description: 'Get details of a specific credit package',
    },
  });

// Admin routes for package management
export const creditPackageAdminRoutes = new Elysia({ prefix: '/api/v1/admin/credits' })
  .use(authMiddleware)
  .post('/packages', async ({ body, user }) => {
    // TODO: Add admin authorization check
    const pkg = await creditPurchaseService.createPackage(body);
    return {
      success: true,
      data: pkg,
    };
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      credits: t.Number(),
      price: t.Number(),
      currency: t.Optional(t.String()),
      bonusCredits: t.Optional(t.Number()),
      isPopular: t.Optional(t.Boolean()),
      displayOrder: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Create credit package',
      description: 'Create a new credit package (admin only)',
    },
  })
  .put('/packages/:uid', async ({ params, body, user }) => {
    // TODO: Add admin authorization check
    const pkg = await creditPurchaseService.updatePackage(params.uid, body);
    return {
      success: true,
      data: pkg,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      credits: t.Optional(t.Number()),
      price: t.Optional(t.Number()),
      bonusCredits: t.Optional(t.Number()),
      isPopular: t.Optional(t.Boolean()),
      displayOrder: t.Optional(t.Number()),
      isActive: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Admin - Credits'],
      summary: 'Update credit package',
      description: 'Update an existing credit package (admin only)',
    },
  });
