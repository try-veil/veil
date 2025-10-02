import { Elysia } from 'elysia';
import { ApiError, isApiError, formatValidationError, formatDatabaseError, ErrorCode, createErrorWithContext, ErrorContext } from '../utils/errors';
import { ZodError } from 'zod';

// Generate unique request ID for error tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const errorHandler = new Elysia()
  .derive({ as: 'global' }, ({ headers, path, request }) => {
    const requestId = headers['x-request-id'] || generateRequestId();
    const context: ErrorContext = {
      requestId,
      endpoint: path,
      method: request.method,
      userAgent: headers['user-agent'],
      ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
      timestamp: new Date().toISOString(),
    };
    
    return { requestId, errorContext: context };
  })
  .onError(({ code, error, set, requestId, errorContext }) => {
    // Handle custom API errors
    if (isApiError(error)) {
      const enhancedError = createErrorWithContext(error, {
        ...errorContext,
        requestId,
      });
      
      set.status = enhancedError.statusCode;
      
      // Log error for monitoring
      console.error(`[ApiError] ${enhancedError.code}:`, {
        message: enhancedError.message,
        requestId,
        context: errorContext,
        stack: enhancedError.stack,
      });
      
      return enhancedError.toJSON();
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationError = formatValidationError(error);
      const enhancedError = createErrorWithContext(validationError, {
        ...errorContext,
        requestId,
      });
      
      set.status = 400;
      
      console.error(`[ValidationError] ${requestId}:`, {
        issues: error.issues,
        context: errorContext,
      });
      
      return enhancedError.toJSON();
    }

    // Handle database errors
    if (error.code && typeof error.code === 'string' && error.code.match(/^(23|42|08)/)) {
      const dbError = formatDatabaseError(error);
      const enhancedError = createErrorWithContext(dbError, {
        ...errorContext,
        requestId,
      });
      
      set.status = enhancedError.statusCode;
      
      console.error(`[DatabaseError] ${requestId}:`, {
        dbCode: error.code,
        message: error.message,
        context: errorContext,
      });
      
      return enhancedError.toJSON();
    }

    // Handle built-in Elysia errors
    const errorResponse = handleElysiaError(code, error, requestId, errorContext);
    if (errorResponse) {
      set.status = errorResponse.statusCode;
      console.error(`[ElysiaError] ${code} ${requestId}:`, {
        message: error.message,
        context: errorContext,
      });
      return errorResponse.body;
    }

    // Handle unknown errors
    const unknownError = new ApiError({
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      cause: error,
      metadata: {
        originalCode: code,
        requestId,
        context: errorContext,
      },
    });
    
    set.status = 500;
    
    // Log full error details for debugging
    console.error(`[UnknownError] ${requestId}:`, {
      originalError: error.message,
      stack: error.stack,
      code,
      context: errorContext,
    });
    
    // Return sanitized error in production
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
      }
    };
  });

function handleElysiaError(
  code: string, 
  error: Error, 
  requestId: string, 
  context: ErrorContext
): { statusCode: number; body: any } | null {
  switch (code) {
    case 'VALIDATION':
      return {
        statusCode: 400,
        body: {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Request validation failed',
            details: error.message,
            requestId,
            timestamp: new Date().toISOString(),
          }
        }
      };

    case 'PARSE':
      return {
        statusCode: 400,
        body: {
          success: false,
          error: {
            code: ErrorCode.INVALID_FORMAT,
            message: 'Invalid request format',
            details: 'Request body must be valid JSON',
            requestId,
            timestamp: new Date().toISOString(),
          }
        }
      };

    case 'NOT_FOUND':
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: 'Endpoint not found',
            details: `The requested endpoint ${context.endpoint} does not exist`,
            requestId,
            timestamp: new Date().toISOString(),
          }
        }
      };

    case 'METHOD_NOT_ALLOWED':
      return {
        statusCode: 405,
        body: {
          success: false,
          error: {
            code: ErrorCode.INVALID_REQUEST_DATA,
            message: 'Method not allowed',
            details: `${context.method} method is not allowed for ${context.endpoint}`,
            requestId,
            timestamp: new Date().toISOString(),
          }
        }
      };

    case 'INTERNAL_SERVER_ERROR':
      return {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            requestId,
            timestamp: new Date().toISOString(),
          }
        }
      };

    default:
      return null;
  }
}

// Helper function for route handlers to throw API errors
export function throwApiError(options: {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: any;
  metadata?: Record<string, any>;
}): never {
  throw new ApiError(options);
}

// Async error wrapper for route handlers
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Re-throw API errors as-is
      if (isApiError(error)) {
        throw error;
      }
      
      // Wrap unknown errors in API error
      throw new ApiError({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Handler execution failed',
        cause: error as Error,
      });
    }
  }) as T;
}