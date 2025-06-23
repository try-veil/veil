/*
  Warnings:

  - A unique constraint covering the columns `[fusionAuthId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fusionAuthId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_fusionAuthId_key" ON "users"("fusionAuthId");
