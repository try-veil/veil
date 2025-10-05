import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../../middleware/auth';
import { pricingService } from '../../../services/pricing-service';

export const adminPricingRoutes = new Elysia({ prefix: '/api/v1/admin/pricing/models' })
  .use(authMiddleware)
  .post('/', async ({ body }) => {
    const model = await pricingService.createModel(body);
    return {
      success: true,
      data: model,
    };
  }, {
    body: t.Object({
      name: t.String(),
      type: t.Union([
        t.Literal('per_request'),
        t.Literal('per_kb'),
        t.Literal('per_minute'),
        t.Literal('tiered'),
      ]),
      baseCost: t.Optional(t.Number()),
      costPerKbRequest: t.Optional(t.Number()),
      costPerKbResponse: t.Optional(t.Number()),
      costPerMinute: t.Optional(t.Number()),
      tiers: t.Optional(t.Array(t.Any())),
    }),
    detail: {
      tags: ['Admin - Pricing'],
      summary: 'Create pricing model',
      description: 'Create a new pricing model',
    },
  })
  .get('/', async () => {
    const models = await pricingService.listModels();
    return {
      success: true,
      data: models,
    };
  }, {
    detail: {
      tags: ['Admin - Pricing'],
      summary: 'List pricing models',
      description: 'Get all pricing models',
    },
  })
  .get('/:uid', async ({ params }) => {
    const model = await pricingService.getModel(params.uid);
    if (!model) {
      throw new Error('Pricing model not found');
    }

    return {
      success: true,
      data: model,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Pricing'],
      summary: 'Get pricing model',
      description: 'Get pricing model details',
    },
  })
  .put('/:uid', async ({ params, body }) => {
    const model = await pricingService.updateModel(params.uid, body);
    return {
      success: true,
      data: model,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      type: t.Optional(t.Union([
        t.Literal('per_request'),
        t.Literal('per_kb'),
        t.Literal('per_minute'),
        t.Literal('tiered'),
      ])),
      baseCost: t.Optional(t.Number()),
      costPerKbRequest: t.Optional(t.Number()),
      costPerKbResponse: t.Optional(t.Number()),
      costPerMinute: t.Optional(t.Number()),
      tiers: t.Optional(t.Array(t.Any())),
      isActive: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Admin - Pricing'],
      summary: 'Update pricing model',
      description: 'Update pricing model configuration',
    },
  })
  .delete('/:uid', async ({ params }) => {
    await pricingService.deleteModel(params.uid);
    return {
      success: true,
      message: 'Pricing model deleted successfully',
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Pricing'],
      summary: 'Delete pricing model',
      description: 'Delete (deactivate) pricing model',
    },
  });
