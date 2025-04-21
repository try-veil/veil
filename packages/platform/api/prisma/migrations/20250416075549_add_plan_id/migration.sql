/*
  Warnings:

  - Added the required column `method` to the `apis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "apis" ADD COLUMN     "method" TEXT NOT NULL,
ADD COLUMN     "requiredHeaders" JSONB;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "planId" TEXT;
