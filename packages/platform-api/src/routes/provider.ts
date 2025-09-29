import { Elysia, t } from 'elysia';
import { APIService } from '../services/api-service';
import {
  createAPISchema,
  updateAPISchema,
  apiParamsSchema,
  apiIdParamsSchema,
  apiQuerySchema,
  type CreateAPIRequest,
  type UpdateAPIRequest,
  type APIParams,
  type APIIdParams,
  type APIQuery
} from '../validation/api-validation';

const apiService = new APIService();

export const providerRoutes = new Elysia({ prefix: '/provider' })
  // Get provider's APIs
  .get('/apis', async ({ query, set }) => {
    try {
      // TODO: Get sellerId from JWT token - for now using placeholder
      const sellerId = 1; // This should come from authenticated user context
      
      const validatedQuery = apiQuerySchema.parse(query);
      
      const filters = {
        search: validatedQuery.search,
        categoryId: validatedQuery.categoryId,
        pricingModel: validatedQuery.pricingModel,
        isActive: validatedQuery.status === 'active' ? true : 
                 validatedQuery.status === 'inactive' ? false : undefined,
      };

      const pagination = {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
      };

      const result = await apiService.getSellerAPIs(sellerId, filters, pagination);

      return {
        success: true,
        data: result.apis,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / validatedQuery.limit),
          hasNext: validatedQuery.page * validatedQuery.limit < result.total,
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
        message: 'Failed to fetch APIs',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create new API
  .post('/apis', async ({ body, set }) => {
    try {
      // TODO: Get sellerId from JWT token - for now using placeholder
      const sellerId = 1; // This should come from authenticated user context
      
      const validatedData = createAPISchema.parse(body);
      const api = await apiService.createAPI(sellerId, validatedData);

      set.status = 201;
      return {
        success: true,
        message: 'API created successfully',
        data: {
          ...api,
          gatewayUrl: api.isActive ? apiService.getGatewayURL(api.uid) : null,
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid category')) {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid category ID'
          };
        }
        
        if (error.message.includes('Invalid') || error.message.includes('required')) {
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
        message: 'Failed to create API',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 200 }),
      description: t.String({ minLength: 1, maxLength: 2000 }),
      version: t.Optional(t.String({ maxLength: 50 })),
      endpoint: t.String({ minLength: 1, maxLength: 500 }),
      baseUrl: t.String({ minLength: 1, maxLength: 500, format: 'uri' }),
      categoryId: t.Optional(t.Integer({ minimum: 1 })),
      documentation: t.Optional(t.String({ maxLength: 500, format: 'uri' })),
      price: t.Optional(t.String()),
      pricingModel: t.Optional(t.Union([
        t.Literal('per_request'),
        t.Literal('monthly'),
        t.Literal('yearly'),
        t.Literal('free')
      ])),
      requestLimit: t.Optional(t.Integer({ minimum: 1, maximum: 1000000 })),
      isPublic: t.Optional(t.Boolean()),
      methods: t.Array(t.Union([
        t.Literal('GET'),
        t.Literal('POST'),
        t.Literal('PUT'),
        t.Literal('PATCH'),
        t.Literal('DELETE'),
        t.Literal('OPTIONS'),
        t.Literal('HEAD')
      ]), { minItems: 1, maxItems: 7 }),
      requiredHeaders: t.Optional(t.Array(t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        value: t.Optional(t.String({ maxLength: 255 })),
        isStatic: t.Optional(t.Boolean()),
        description: t.Optional(t.String({ maxLength: 500 }))
      }), { maxItems: 20 }))
    })
  })

  // Get API by UID
  .get('/apis/:uid', async ({ params, set }) => {
    try {
      // TODO: Get sellerId from JWT token - for now using placeholder
      const sellerId = 1; // This should come from authenticated user context
      
      const { uid } = apiParamsSchema.parse(params);
      const api = await apiService.getAPIByUid(uid, sellerId);

      return {
        success: true,
        data: {
          ...api,
          gatewayUrl: api.isActive ? apiService.getGatewayURL(api.uid) : null,
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

        if (error.message === 'You can only access your own APIs') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only access your own APIs'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch API',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Update API
  .put('/apis/:uid', async ({ params, body, set }) => {
    try {
      // TODO: Get sellerId from JWT token - for now using placeholder
      const sellerId = 1; // This should come from authenticated user context
      
      const { uid } = apiParamsSchema.parse(params);
      const validatedData = updateAPISchema.parse(body);
      
      // First get the API to get the ID
      const existingAPI = await apiService.getAPIByUid(uid, sellerId);
      const updatedAPI = await apiService.updateAPI(existingAPI.id, sellerId, validatedData);

      return {
        success: true,
        message: 'API updated successfully',
        data: {
          ...updatedAPI,
          gatewayUrl: updatedAPI.isActive ? apiService.getGatewayURL(updatedAPI.uid) : null,
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

        if (error.message === 'You can only update your own APIs') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only update your own APIs'
          };
        }

        if (error.message.includes('Invalid category')) {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid category ID'
          };
        }

        if (error.message.includes('Invalid') || error.message.includes('required')) {
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
        message: 'Failed to update API',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
      description: t.Optional(t.String({ minLength: 1, maxLength: 2000 })),
      version: t.Optional(t.String({ maxLength: 50 })),
      endpoint: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
      baseUrl: t.Optional(t.String({ minLength: 1, maxLength: 500, format: 'uri' })),
      categoryId: t.Optional(t.Integer({ minimum: 1 })),
      documentation: t.Optional(t.String({ maxLength: 500, format: 'uri' })),
      price: t.Optional(t.String()),
      pricingModel: t.Optional(t.Union([
        t.Literal('per_request'),
        t.Literal('monthly'),
        t.Literal('yearly'),
        t.Literal('free')
      ])),
      requestLimit: t.Optional(t.Integer({ minimum: 1, maximum: 1000000 })),
      isPublic: t.Optional(t.Boolean()),
      methods: t.Optional(t.Array(t.Union([
        t.Literal('GET'),
        t.Literal('POST'),
        t.Literal('PUT'),
        t.Literal('PATCH'),
        t.Literal('DELETE'),
        t.Literal('OPTIONS'),
        t.Literal('HEAD')
      ]), { minItems: 1, maxItems: 7 })),
      requiredHeaders: t.Optional(t.Array(t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        value: t.Optional(t.String({ maxLength: 255 })),
        isStatic: t.Optional(t.Boolean()),
        description: t.Optional(t.String({ maxLength: 500 }))
      }), { maxItems: 20 }))
    })
  })

  // Delete API
  .delete('/apis/:uid', async ({ params, set }) => {
    try {
      // TODO: Get sellerId from JWT token - for now using placeholder
      const sellerId = 1; // This should come from authenticated user context
      
      const { uid } = apiParamsSchema.parse(params);
      
      // First get the API to get the ID
      const existingAPI = await apiService.getAPIByUid(uid, sellerId);
      await apiService.deleteAPI(existingAPI.id, sellerId);

      set.status = 204;
      return {
        success: true,
        message: 'API deleted successfully'
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

        if (error.message === 'You can only delete your own APIs') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only delete your own APIs'
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete API',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Note: Analytics endpoints will be added later in the analytics phase