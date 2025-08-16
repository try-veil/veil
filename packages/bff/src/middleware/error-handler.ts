import { Elysia } from 'elysia';

export const errorHandler = new Elysia()
  .error({
    VALIDATION_ERROR: class extends Error {},
    UNAUTHORIZED: class extends Error {},
    FORBIDDEN: class extends Error {},
    NOT_FOUND: class extends Error {},
    CONFLICT: class extends Error {},
    INTERNAL_ERROR: class extends Error {},
  })
  .onError(({ code, error, set }) => {
    console.error(`[Error] ${code}:`, error.message);
    
    switch (code) {
      case 'VALIDATION':
      case 'VALIDATION_ERROR':
        set.status = 400;
        return {
          success: false,
          message: 'Validation failed',
          error: error.message,
        };

      case 'UNAUTHORIZED':
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized access',
          error: error.message,
        };

      case 'FORBIDDEN':
        set.status = 403;
        return {
          success: false,
          message: 'Forbidden access',
          error: error.message,
        };

      case 'NOT_FOUND':
        set.status = 404;
        return {
          success: false,
          message: 'Resource not found',
          error: error.message,
        };

      case 'CONFLICT':
        set.status = 409;
        return {
          success: false,
          message: 'Conflict occurred',
          error: error.message,
        };

      case 'PARSE':
        set.status = 400;
        return {
          success: false,
          message: 'Invalid JSON format',
          error: 'Request body must be valid JSON',
        };

      case 'INTERNAL_SERVER_ERROR':
      case 'INTERNAL_ERROR':
      default:
        console.error('[Internal Error]:', error);
        set.status = 500;
        return {
          success: false,
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        };
    }
  });