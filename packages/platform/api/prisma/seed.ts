import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean up existing data (optional - uncomment if needed)
  // await cleanDatabase();
  
  // 1. Create a tenant
  const tenant = await createTenant();
  
  // 2. Create users (different types)
  const users = await createUsers();
  
  // 3. Create wallets for each user
  const wallets = await createWallets(users, tenant.id);
  
  // 4. Create a gateway and template
  const gatewayTemplate = await createGatewayTemplate();
  const gateway = await createGateway(tenant.id, gatewayTemplate.id);
  
  // 5. Create API, project, and subscription
  const api = await createApi();
  const project = await createProject(users[0].id);
  const plan = await createPlan();
  
  // Link project to API
  await linkProjectToApi(project.id, api.id);
    // 6. Create subscription
  const subscription = await createSubscription(tenant.id, project.id, users[0].id, api.id, plan.id);
  
  // 7. Create some example payments for testing Razorpay integration
  const payments = await createTestPayments(tenant.id, wallets[0].id, users[0].id);
  
  console.log('✅ Database seeding completed!');
  console.log('📊 Created entities:');
  console.log(`- Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Wallets: ${wallets.length}`);
  console.log(`- API: ${api.name}`);
  console.log(`- Project: ${project.name}`);
  console.log(`- Subscription: ${subscription.id}`);
  console.log(`- Payments: ${payments.length}`);

  console.log('\n🔑 Test user credentials:');
  users.forEach(user => {
    console.log(`- ${user.type}: ${user.email} (ID: ${user.id})`);
  });
}

async function cleanDatabase() {
  // Delete all data in reverse order of dependencies
  console.log('🧹 Cleaning existing data...');
  
  await prisma.apiUsage.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.projectAllowedAPI.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.api.deleteMany({});
  await prisma.projectPricing.deleteMany({});
  await prisma.projectAcl.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.paymentAttempt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.gateway.deleteMany({});
  await prisma.gatewayTemplate.deleteMany({});
  await prisma.metadataAttribute.deleteMany({});
  await prisma.userAttribute.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  
  console.log('✅ Database cleaned');
}

async function createTenant() {
  const tenantId = uuidv4();
  
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Test Organization',
      domain: 'testorg.com',
      slugifiedKey: 'test-organization',
    },
  });
  
  console.log(`✅ Created tenant: ${tenant.name}`);
  return tenant;
}

async function createUsers() {
  const userTypes = ['USER', 'TEAM', 'ORGANIZATION'];
  const users = [];
  
  for (const type of userTypes) {
    const userId = uuidv4();
    const username = `test${type.toLowerCase()}`;
    
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        id: userId,
        fusionAuthId: uuidv4(), // Fake FusionAuth ID
        name: `Test ${type}`,
        username,
        email: `${username}@example.com`,
        slugifiedName: username,
        type: type as any,
      },
    });
    
    console.log(`✅ Created user: ${user.name} (${user.type})`);
    users.push(user);
  }
  
  return users;
}

async function createWallets(users, tenantId) {
  const wallets = [];
  
  for (const user of users) {
    const walletId = uuidv4();
    
    const wallet = await prisma.wallet.upsert({
      where: { id: walletId },
      update: {},
      create: {
        id: walletId,
        customerId: user.id,
        tenantId,
        balance: 1000,
        creditBalance: 1000,
        currency: 'CREDITS',
      },
    });
    
    // Create an initial credit transaction
    await prisma.walletTransaction.create({
      data: {
        id: uuidv4(),
        walletId: wallet.id,
        tenantId,
        customerId: user.id,
        type: 'CREDIT',
        subtype: 'FREE',
        status: 'COMPLETED',
        amount: 1000,
        creditsAvailable: 1000,
        description: 'Initial credit balance',
      },
    });
    
    console.log(`✅ Created wallet for user: ${user.name} with balance: 1000`);
    wallets.push(wallet);
  }
  
  return wallets;
}

async function createGatewayTemplate() {
  const template = await prisma.gatewayTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Default Template',
      urlPattern: 'https://{api}.example.com/{version}/',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Version': '1.0'
      },
    },
  });
  
  console.log(`✅ Created gateway template: ${template.name}`);
  return template;
}

async function createGateway(tenantId, templateId) {
  const gateway = await prisma.gateway.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      dns: 'api.example.com',
      serviceStatus: 'ACTIVE',
      type: 'VEIL',
      status: 'ACTIVE',
      isDefault: true,
      templateId,
      tenantId,
    },
  });
  
  console.log(`✅ Created gateway: ${gateway.dns}`);
  return gateway;
}

async function createApi() {
  const apiId = uuidv4();
  
  const api = await prisma.api.upsert({
    where: { id: apiId },
    update: {},
    create: {
      id: apiId,
      name: 'Test API',
      description: 'API for testing',
      version: '1.0',
      path: '/test/api/v1',
      providerId: uuidv4(),
      method: 'GET',
      specification: {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0'
        },
        paths: {}
      },
    },
  });
  
  console.log(`✅ Created API: ${api.name}`);
  return api;
}

async function createProject(userId) {
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      favorite: true,
      projectAcls: {
        create: {
          userId,
        }
      }
    },
  });
  
  // Create project pricing
  await prisma.projectPricing.create({
    data: {
      projectId: project.id,
      name: 'Basic Plan',
      price: 9.99,
      currency: 'USD',
      interval: 'MONTHLY',
      status: 'ACTIVE',
    }
  });
  
  console.log(`✅ Created project: ${project.name}`);
  return project;
}

async function linkProjectToApi(projectId, apiId) {
  const projectAllowedApi = await prisma.projectAllowedAPI.create({
    data: {
      projectId,
      apiId,
      apiVersionId: '1.0',
      api: {
        id: apiId,
        name: 'Test API',
        version: '1.0'
      },
    },
  });
  
  console.log('✅ Linked project to API');
  return projectAllowedApi;
}

async function createPlan() {
  const planId = uuidv4();
  
  const plan = await prisma.plan.upsert({
    where: { id: planId },
    update: {},
    create: {
      id: planId,
      name: 'Standard Plan',
      description: 'Standard plan for testing',
    },
  });
  
  console.log(`✅ Created plan: ${plan.name}`);
  return plan;
}

async function createSubscription(tenantId, projectId, userId, apiId, planId) {
  const subscription = await prisma.subscription.create({
    data: {
      tenantId,
      projectId,
      userId,
      apiId,
      planId,
      name: 'Test Subscription',
      apiKey: `test-api-key-${uuidv4()}`,
      status: 'ACTIVE',
    },
  });
  
  console.log(`✅ Created subscription with API key: ${subscription.apiKey}`);
  return subscription;
}

async function createTestPayments(tenantId, walletId, customerId) {
  const payments = [];
  
  // 1. Create a successful payment
  const successfulPayment = await prisma.payment.create({
    data: {
      id: uuidv4(),
      tenantId,
      idempotencyKey: `payment-${uuidv4()}`,
      destinationType: 'WALLET_TOPUP',
      destinationId: walletId,
      paymentMethodType: 'CARD',
      paymentMethodId: `card_${uuidv4()}`,
      paymentGateway: 'RAZORPAY',
      gatewayPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
      amount: 100.00,
      currency: 'USD',
      paymentStatus: 'SUCCEEDED',
      trackAttempts: true,
      metadata: {
        customerId,
        walletId,
        description: 'Credit top-up via card'
      },
      succeededAt: new Date(),
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(),
    }
  });
  
  // Add a successful payment attempt
  await prisma.paymentAttempt.create({
    data: {
      id: uuidv4(),
      tenantId,
      paymentId: successfulPayment.id,
      attemptNumber: 1,
      paymentStatus: 'SUCCEEDED',
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(),
    }
  });
  
  payments.push(successfulPayment);
  
  // 2. Create a failed payment
  const failedPayment = await prisma.payment.create({
    data: {
      id: uuidv4(),
      tenantId,
      idempotencyKey: `payment-${uuidv4()}`,
      destinationType: 'WALLET_TOPUP',
      destinationId: walletId,
      paymentMethodType: 'CARD',
      paymentMethodId: `card_${uuidv4()}`,
      paymentGateway: 'RAZORPAY',
      gatewayPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
      amount: 50.00,
      currency: 'USD',
      paymentStatus: 'FAILED',
      trackAttempts: true,
      metadata: {
        customerId,
        walletId,
        description: 'Failed credit top-up'
      },
      failedAt: new Date(),
      errorMessage: 'Card declined by bank',
      createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      updatedAt: new Date(),
    }
  });
  
  // Add a failed payment attempt
  await prisma.paymentAttempt.create({
    data: {
      id: uuidv4(),
      tenantId,
      paymentId: failedPayment.id,
      attemptNumber: 1,
      paymentStatus: 'FAILED',
      errorMessage: 'Card declined by bank',
      createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      updatedAt: new Date(),
    }
  });
  
  payments.push(failedPayment);
  
  // 3. Create a pending payment ready for testing capture
  const pendingPayment = await prisma.payment.create({
    data: {
      id: uuidv4(),
      tenantId,
      idempotencyKey: `payment-${uuidv4()}`,
      destinationType: 'WALLET_TOPUP',
      destinationId: walletId,
      paymentMethodType: 'CARD',
      paymentMethodId: `card_${uuidv4()}`,
      paymentGateway: 'RAZORPAY',
      gatewayPaymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
      amount: 200.00,
      currency: 'USD',
      paymentStatus: 'PENDING',
      trackAttempts: true,
      metadata: {
        customerId,
        walletId,
        description: 'Pending payment for capture test'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  
  payments.push(pendingPayment);
  
  console.log(`✅ Created ${payments.length} test payments`);
  return payments;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });



