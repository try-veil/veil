import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { config } from "./config";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { publicRateLimit, rateLimit } from "./middleware/rate-limit";
import { customCors } from "./middleware/cors";

// Import routes
import { authRoutes } from "./routes/auth";
import { marketplaceRoutes } from "./routes/marketplace";
import { sellerRoutes } from "./routes/seller";
import { apiKeyRoutes } from "./routes/api-keys";
import { profileRoutes } from "./routes/profile";
import { adminRoutes } from "./routes/admin";
import { categoryRoutes } from "./routes/categories";
import { providerRoutes } from "./routes/provider";
import { subscriptionRoutes } from "./routes/subscriptions";
import { paymentRoutes } from "./routes/payments";
import { analyticsRoutes } from "./routes/analytics";
import { approvalRoutes } from "./routes/approvals";
import { usageRoutes } from "./routes/usage";
import { quotaRoutes } from "./routes/quota";
import { pricingRoutes } from "./routes/pricing";
import { eventRoutes } from "./routes/events";
import { walletRoutes, ledgerRoutes } from "./routes/wallet";
import { pricingService } from "./services/pricing/pricing-service";
import { jobScheduler } from "./jobs/scheduler";
import { startEventQueue, stopEventQueue } from "./services/event-handlers";
import { creditWorker } from "./jobs/credit-worker";
import { creditDeductionWorker } from "./jobs/credit-deduction-worker";
import { natsClient } from "./services/nats-client";

const app = new Elysia()
  // Add middleware
  .use(customCors(config.cors.origins))
  .use(swagger({
    documentation: {
      info: {
        title: 'Veil SaaS Platform BFF API',
        version: '1.0.0',
        description: 'Backend for Frontend API for the Veil SaaS platform providing user authentication, API marketplace, and key management.',
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Marketplace', description: 'API marketplace endpoints' },
        { name: 'Categories', description: 'API category management endpoints' },
        { name: 'Provider', description: 'API provider management endpoints' },
        { name: 'Subscriptions', description: 'Subscription management endpoints' },
        { name: 'Payments', description: 'Payment processing endpoints' },
        { name: 'Wallet', description: 'User wallet and credit management endpoints' },
        { name: 'Ledger', description: 'Double-entry ledger and accounting endpoints' },
        { name: 'Analytics', description: 'Analytics and reporting endpoints' },
        { name: 'Seller', description: 'Seller dashboard endpoints' },
        { name: 'API Keys', description: 'API key management endpoints' },
        { name: 'Profile', description: 'User profile endpoints' },
        { name: 'Admin', description: 'Admin panel endpoints' },
        { name: 'Approvals', description: 'Approval workflow endpoints' },
        { name: 'Usage', description: 'API usage tracking and analytics endpoints' },
        { name: 'Quota', description: 'API quota management and monitoring endpoints' },
        { name: 'Pricing', description: 'Pricing models, invoices, and billing management endpoints' },
        { name: 'Events', description: 'Event queue monitoring and management endpoints' },
      ],
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server'
        }
      ]
    }
  }))
  .use(logger)
  .use(publicRateLimit(100, 15)) // 100 requests per 15 minutes for public endpoints
  .use(errorHandler)
  
  // Health check endpoint
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  }))
  
  // Root endpoint
  .get("/", () => ({
    message: "Veil SaaS Platform BFF API",
    version: "1.0.0",
    documentation: "/swagger",
  }))
  
  // API routes
  .group("/api/v1", (app) =>
    app
      // .use(rateLimit()) // Apply authenticated rate limiting to API routes - TEMPORARILY DISABLED
      .use(authRoutes)
      .use(marketplaceRoutes)
      .use(categoryRoutes)
      .use(providerRoutes)
      .use(subscriptionRoutes)
      .use(paymentRoutes)
      .use(walletRoutes)
      .use(ledgerRoutes)
      .use(analyticsRoutes)
      .use(sellerRoutes)
      .use(apiKeyRoutes)
      .use(profileRoutes)
      .use(adminRoutes)
      .use(approvalRoutes)
      .use(usageRoutes)
      .use(quotaRoutes)
      .use(pricingRoutes)
      .use(eventRoutes)
  )
  
  // 404 handler
  .all("*", ({ set }) => {
    set.status = 404;
    return {
      success: false,
      message: "Route not found",
    };
  });

// Initialize services before starting the server
async function initializeServices() {
  try {
    console.log('🔧 Initializing services...');

    // Initialize pricing service - loads YAML configurations and syncs to database
    await pricingService.initialize();
    console.log('✅ Pricing service initialized');

    // Start event queue for reliable event processing with retries
    startEventQueue();
    console.log('✅ Event queue started');

    // Start background job scheduler
    jobScheduler.start();
    console.log('✅ Job scheduler started');

    // Start credit consumption worker (NATS-based)
    try {
      await creditWorker.start();
      console.log('✅ Credit worker started (subscription-based tracking)');
    } catch (error) {
      console.error('⚠️  Credit worker failed to start:', error);
      console.log('   Subscription-based tracking will be disabled');
      // Continue startup even if credit worker fails
    }

    // Start credit deduction worker (wallet-based credit system)
    try {
      await creditDeductionWorker.start();
      console.log('✅ Credit deduction worker started (wallet-based credit system)');
    } catch (error) {
      console.error('⚠️  Credit deduction worker failed to start:', error);
      console.log('   Wallet-based credit deduction will be disabled');
      // Continue startup even if worker fails
    }

  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    // Don't fail startup if pricing service initialization fails
    // This allows the API to start even if pricing config is missing
  }
}

// Start server after initialization
(async () => {
  await initializeServices();

  app.listen(config.port);

  console.log(
    `🚀 Veil SaaS BFF Server is running at http://${app.server?.hostname}:${app.server?.port}`
  );
})();

console.log(`📊 Environment: ${config.nodeEnv}`);
console.log(`🔗 Database URL: ${config.database.url.replace(/:[^:]*@/, ':****@')}`);
console.log(`🔒 CORS Origins: ${config.cors.origins.join(', ')}`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  stopEventQueue();
  jobScheduler.stop();
  await creditWorker.stop();
  await creditDeductionWorker.stop();
  await natsClient.close();
  app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  stopEventQueue();
  jobScheduler.stop();
  await creditWorker.stop();
  await creditDeductionWorker.stop();
  await natsClient.close();
  app.stop();
  process.exit(0);
});
