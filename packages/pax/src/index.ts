import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { config } from './config';
import { paymentRoutes } from './routes/payments';
import { webhookRoutes } from './routes/webhooks';
import { creditAccountRoutes } from './routes/credits/accounts';
import { creditTransactionRoutes } from './routes/credits/transactions';
import { creditPackageRoutes, creditPackageAdminRoutes } from './routes/credits/packages';
import { creditPurchaseRoutes } from './routes/credits/purchases';
import { internalCreditRoutes } from './routes/internal/credits';
import { adminCreditRoutes } from './routes/admin/credits';
import { proxyRoutes } from './routes/proxy';
import { adminProxyApiRoutes } from './routes/admin/proxy/apis';
import { adminProxyRouteRoutes } from './routes/admin/proxy/routes';
import { adminPricingRoutes } from './routes/admin/proxy/pricing';
import { usageRoutes } from './routes/usage';
import { startBackgroundJobs } from './jobs';

const app = new Elysia()
  .use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: 'PAX - Payment & Proxy Service API',
          version: '1.0.0',
          description: 'Payment gateway and API proxy service for Veil platform',
        },
        tags: [
          { name: 'Payments', description: 'Payment processing endpoints' },
          { name: 'Webhooks', description: 'Webhook handlers for payment providers' },
          { name: 'Credits', description: 'Credit management and purchase endpoints' },
          { name: 'Internal - Credits', description: 'Internal credit operations' },
          { name: 'Admin - Credits', description: 'Admin credit management' },
          { name: 'Proxy', description: 'API proxy endpoints with usage metering' },
          { name: 'Admin - Proxy', description: 'Admin proxy API management' },
          { name: 'Admin - Pricing', description: 'Admin pricing model management' },
          { name: 'Usage', description: 'Usage analytics and records' },
        ],
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
        ],
      },
    })
  )
  .onError(({ code, error, set }) => {
    console.error('Error:', error);

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Validation error',
        error: error.message,
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        message: 'Route not found',
      };
    }

    set.status = 500;
    return {
      success: false,
      message: error.message || 'Internal server error',
    };
  })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pax',
    environment: config.nodeEnv,
  }))
  .get('/', () => ({
    message: 'PAX - Payment & Proxy Service',
    version: '1.0.0',
    documentation: '/swagger',
  }))
  .group('/api/v1', (app) =>
    app
      .use(paymentRoutes)
      .use(webhookRoutes)
  )
  .use(creditAccountRoutes)
  .use(creditTransactionRoutes)
  .use(creditPackageRoutes)
  .use(creditPurchaseRoutes)
  .use(creditPackageAdminRoutes)
  .use(adminCreditRoutes)
  .use(internalCreditRoutes)
  .use(proxyRoutes)
  .use(adminProxyApiRoutes)
  .use(adminProxyRouteRoutes)
  .use(adminPricingRoutes)
  .use(usageRoutes)
  .listen(config.port);

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 PAX Service Running                             ║
║                                                       ║
║   Port: ${config.port}                                         ║
║   Environment: ${config.nodeEnv}                          ║
║   Swagger: http://localhost:${config.port}/swagger          ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);

console.log(`📊 Database: ${config.database.url.replace(/:[^:]*@/, ':****@')}`);
console.log(`💳 Payment Provider: Razorpay ${config.razorpay.keyId ? '✅' : '❌'}`);
console.log(`🔒 CORS Origins: ${config.cors.origins.join(', ')}`);

// Start background jobs
const jobs = startBackgroundJobs();
