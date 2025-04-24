-- CreateEnum
CREATE TYPE "LoadBalancerStrategy" AS ENUM ('RoundRobin', 'Geolocation');

-- CreateTable
CREATE TABLE "HubListing" (
    "id" TEXT NOT NULL,
    "logo" TEXT,
    "category" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "website" TEXT,
    "termsOfUse" TEXT,
    "visibleToPublic" BOOLEAN NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "loadBalancer" "LoadBalancerStrategy" NOT NULL,
    "healthCheckUrl" TEXT,
    "apiDocumentation" TEXT,
    "proxySecret" TEXT,
    "requestSizeLimitMb" INTEGER,
    "proxyTimeoutSeconds" INTEGER,
    "basicPlanId" TEXT,
    "proPlanId" TEXT,
    "ultraPlanId" TEXT,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "HubListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "pricePerMonth" DOUBLE PRECISION NOT NULL,
    "requestQuotaPerMonth" DOUBLE PRECISION NOT NULL,
    "hardLimitQuota" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HubListing_basicPlanId_key" ON "HubListing"("basicPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "HubListing_proPlanId_key" ON "HubListing"("proPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "HubListing_ultraPlanId_key" ON "HubListing"("ultraPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "HubListing_projectId_key" ON "HubListing"("projectId");

-- AddForeignKey
ALTER TABLE "HubListing" ADD CONSTRAINT "HubListing_basicPlanId_fkey" FOREIGN KEY ("basicPlanId") REFERENCES "PlanConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubListing" ADD CONSTRAINT "HubListing_proPlanId_fkey" FOREIGN KEY ("proPlanId") REFERENCES "PlanConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubListing" ADD CONSTRAINT "HubListing_ultraPlanId_fkey" FOREIGN KEY ("ultraPlanId") REFERENCES "PlanConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubListing" ADD CONSTRAINT "HubListing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
