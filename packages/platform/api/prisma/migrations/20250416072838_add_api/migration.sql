/*
  Warnings:

  - The values [RAPIDAPI,APIGEE,CUSTOM] on the enum `GatewayType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PricingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PricingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');

-- AlterEnum
BEGIN;
CREATE TYPE "GatewayType_new" AS ENUM ('VEIL');
ALTER TABLE "gateways" ALTER COLUMN "type" TYPE "GatewayType_new" USING ("type"::text::"GatewayType_new");
ALTER TYPE "GatewayType" RENAME TO "GatewayType_old";
ALTER TYPE "GatewayType_new" RENAME TO "GatewayType";
DROP TYPE "GatewayType_old";
COMMIT;

-- AlterTable
ALTER TABLE "gateways" ALTER COLUMN "type" SET DEFAULT 'VEIL';

-- CreateTable
CREATE TABLE "project_pricing" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "PricingInterval" NOT NULL,
    "status" "PricingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "pricingId" TEXT,
    "name" TEXT,
    "description" TEXT,
    "apiKey" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "specification" JSONB NOT NULL,
    "status" "ApiStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usages" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latency" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "api_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_apiKey_key" ON "subscriptions"("apiKey");

-- AddForeignKey
ALTER TABLE "project_pricing" ADD CONSTRAINT "project_pricing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "project_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
