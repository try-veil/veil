import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../../middleware/auth';
import { proxyRouteRepository } from '../../../repositories/proxy-route-repository';
import { proxyApiRepository } from '../../../repositories/proxy-api-repository';

export const adminProxyRouteRoutes = new Elysia({ prefix: '/api/v1/admin/proxy/routes' })
  .use(authMiddleware)
  .post('/', async ({ body }) => {
    // Verify API exists
    const api = await proxyApiRepository.findByUid(body.apiUid);
    if (!api) {
      throw new Error('API not found');
    }

    const route = await proxyRouteRepository.create({
      apiId: api.id,
      pathPattern: body.pathPattern,
      method: body.method,
      pricingModelId: body.pricingModelId,
      rateLimitPerMinute: body.rateLimitPerMinute,
      timeoutSeconds: body.timeoutSeconds,
    });

    return {
      success: true,
      data: route,
    };
  }, {
    body: t.Object({
      apiUid: t.String(),
      pathPattern: t.String(),
      method: t.String({ default: 'GET' }),
      pricingModelId: t.Optional(t.Number()),
      rateLimitPerMinute: t.Optional(t.Number()),
      timeoutSeconds: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Create proxy route',
      description: 'Create a new route for a proxy API',
    },
  })
  .get('/', async ({ query }) => {
    if (!query.apiUid) {
      throw new Error('apiUid query parameter is required');
    }

    const api = await proxyApiRepository.findByUid(query.apiUid);
    if (!api) {
      throw new Error('API not found');
    }

    const routes = await proxyRouteRepository.findByApiId(api.id);
    return {
      success: true,
      data: routes,
    };
  }, {
    query: t.Object({
      apiUid: t.String(),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'List proxy routes',
      description: 'Get all routes for a specific proxy API',
    },
  })
  .get('/:uid', async ({ params }) => {
    const route = await proxyRouteRepository.findByUid(params.uid);
    if (!route) {
      throw new Error('Route not found');
    }

    return {
      success: true,
      data: route,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Get proxy route',
      description: 'Get a specific proxy route by UID',
    },
  })
  .put('/:uid', async ({ params, body }) => {
    const route = await proxyRouteRepository.findByUid(params.uid);
    if (!route) {
      throw new Error('Route not found');
    }

    const updated = await proxyRouteRepository.update(route.id, {
      pathPattern: body.pathPattern,
      method: body.method,
      pricingModelId: body.pricingModelId,
      rateLimitPerMinute: body.rateLimitPerMinute,
      timeoutSeconds: body.timeoutSeconds,
    });

    return {
      success: true,
      data: updated,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    body: t.Object({
      pathPattern: t.Optional(t.String()),
      method: t.Optional(t.String()),
      pricingModelId: t.Optional(t.Number()),
      rateLimitPerMinute: t.Optional(t.Number()),
      timeoutSeconds: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Update proxy route',
      description: 'Update a proxy route configuration',
    },
  })
  .delete('/:uid', async ({ params }) => {
    const route = await proxyRouteRepository.findByUid(params.uid);
    if (!route) {
      throw new Error('Route not found');
    }

    await proxyRouteRepository.delete(route.id);
    return {
      success: true,
      message: 'Route deleted successfully',
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Delete proxy route',
      description: 'Delete a proxy route',
    },
  });
