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

const app = new Elysia()
  // Add middleware
  .use(customCors(['http://localhost:3001', 'http://localhost:3000']))
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
        { name: 'Analytics', description: 'Analytics and reporting endpoints' },
        { name: 'Seller', description: 'Seller dashboard endpoints' },
        { name: 'API Keys', description: 'API key management endpoints' },
        { name: 'Profile', description: 'User profile endpoints' },
        { name: 'Admin', description: 'Admin panel endpoints' },
        { name: 'Approvals', description: 'Approval workflow endpoints' },
        { name: 'Usage', description: 'API usage tracking and analytics endpoints' },
        { name: 'Quota', description: 'API quota management and monitoring endpoints' },
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
      .use(analyticsRoutes)
      .use(sellerRoutes)
      .use(apiKeyRoutes)
      .use(profileRoutes)
      .use(adminRoutes)
      .use(approvalRoutes)
      .use(usageRoutes)
      .use(quotaRoutes)
  )
  
  // 404 handler
  .all("*", ({ set }) => {
    set.status = 404;
    return {
      success: false,
      message: "Route not found",
    };
  })
  
  .listen(config.port);

console.log(
  `🚀 Veil SaaS BFF Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

console.log(`📊 Environment: ${config.nodeEnv}`);
console.log(`🔗 Database URL: ${config.database.url.replace(/:[^:]*@/, ':****@')}`);
console.log(`🔒 CORS Origin: http://localhost:3001,http://localhost:3000`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  app.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  app.stop();
  process.exit(0);
});
