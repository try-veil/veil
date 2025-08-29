/*
  Warnings:

  - You are about to drop the column `creditBalance` on the `wallets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "creditBalance";

-- CreateTable
CREATE TABLE "razorpay_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "purpose" TEXT NOT NULL DEFAULT 'credits',
    "creditAmount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razorpay_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_payments_razorpayOrderId_key" ON "razorpay_payments"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "razorpay_payments_userId_idx" ON "razorpay_payments"("userId");

-- CreateIndex
CREATE INDEX "razorpay_payments_razorpayOrderId_idx" ON "razorpay_payments"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "razorpay_payments_razorpayPaymentId_idx" ON "razorpay_payments"("razorpayPaymentId");

-- AddForeignKey
ALTER TABLE "razorpay_payments" ADD CONSTRAINT "razorpay_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
