/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `credit_balances` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_userId_key" ON "credit_balances"("userId");
