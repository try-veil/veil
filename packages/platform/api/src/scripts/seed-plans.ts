import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('Seeding default plans...');

  const plans = [
    {
      name: 'Free',
      description: 'Basic plan with limited API calls - perfect for testing and small projects',
    },
    {
      name: 'Basic',
      description: 'Standard plan with moderate API limits - suitable for small to medium applications',
    },
    {
      name: 'Pro',
      description: 'Professional plan with high API limits - ideal for production applications',
    },
    {
      name: 'Enterprise',
      description: 'Enterprise plan with unlimited API calls and premium support',
    },
  ];

  for (const planData of plans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { name: planData.name },
    });

    if (!existingPlan) {
      const plan = await prisma.plan.create({
        data: planData,
      });
      console.log(`Created plan: ${plan.name} (ID: ${plan.id})`);
    } else {
      console.log(`Plan '${planData.name}' already exists`);
    }
  }

  console.log('Plan seeding completed!');
}

seedPlans()
  .catch((e) => {
    console.error('Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });