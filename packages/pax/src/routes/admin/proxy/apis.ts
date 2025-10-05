import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../../middleware/auth';
import { proxyApiService } from '../../../services/proxy-api-service';
import { proxyRouteRepository } from '../../../repositories/proxy-route-repository';

export const adminProxyApiRoutes = new Elysia({ prefix: '/api/v1/admin/proxy/apis' })
  .use(authMiddleware)
  .post('/', async ({ body }) => {
    const api = await proxyApiService.createApi(body);
    return {
      success: true,
      data: api,
    };
  }, {
    body: t.Object({
      slug: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      upstreamUrl: t.String(),
      defaultPricingModelId: t.Optional(t.Number()),
      defaultHeaders: t.Optional(t.Any()),
      stripHeaders: t.Optional(t.Array(t.String())),
      timeoutSeconds: t.Optional(t.Number()),
      rateLimitPerMinute: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Create proxy API',
      description: 'Create a new proxy API configuration',
    },
  })
  .get('/', async () => {
    const apis = await proxyApiService.listApis();
    return {
      success: true,
      data: apis,
    };
  }, {
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'List proxy APIs',
      description: 'Get all proxy API configurations',
    },
  })
  .get('/:uid', async ({ params }) => {
    const api = await proxyApiService.getApiByUid(params.uid);
    if (!api) {
      throw new Error('API not found');
    }

    // Get routes for this API
    const routes = await proxyRouteRepository.findByApiId(api.id);

    return {
      success: true,
      data: {
        ...api,
        routes,
      },
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Get proxy API',
      description: 'Get proxy API configuration with routes',
    },
  })
  .put('/:uid', async ({ params, body }) => {
    const api = await proxyApiService.updateApi(params.uid, body);
    return {
      success: true,
      data: api,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      upstreamUrl: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean()),
      defaultPricingModelId: t.Optional(t.Number()),
      defaultHeaders: t.Optional(t.Any()),
      stripHeaders: t.Optional(t.Array(t.String())),
      timeoutSeconds: t.Optional(t.Number()),
      rateLimitPerMinute: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Update proxy API',
      description: 'Update proxy API configuration',
    },
  })
  .delete('/:uid', async ({ params }) => {
    await proxyApiService.deleteApi(params.uid);
    return {
      success: true,
      message: 'API deleted successfully',
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    detail: {
      tags: ['Admin - Proxy'],
      summary: 'Delete proxy API',
      description: 'Delete (deactivate) proxy API',
    },
  });
