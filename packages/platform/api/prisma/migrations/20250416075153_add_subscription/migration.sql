/*
  Warnings:

  - A unique constraint covering the columns `[path]` on the table `apis` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subscriptionId` to the `api_usages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `apis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `apis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apiId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "api_usages" ADD COLUMN     "subscriptionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "apis" ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "providerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "apiId" TEXT NOT NULL,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "lastUsed" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "apis_path_key" ON "apis"("path");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usages" ADD CONSTRAINT "api_usages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
