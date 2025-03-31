/*
  Warnings:

  - You are about to drop the `API` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_APIToApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

-- DropForeignKey
ALTER TABLE "_APIToApiKey" DROP CONSTRAINT "_APIToApiKey_A_fkey";

-- DropForeignKey
ALTER TABLE "_APIToApiKey" DROP CONSTRAINT "_APIToApiKey_B_fkey";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "apiPathId" TEXT;

-- DropTable
DROP TABLE "API";

-- DropTable
DROP TABLE "_APIToApiKey";

-- CreateTable
CREATE TABLE "Api" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Api_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiPath" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiPath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Api_userId_name_key" ON "Api"("userId", "name");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_apiPathId_fkey" FOREIGN KEY ("apiPathId") REFERENCES "ApiPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Api" ADD CONSTRAINT "Api_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiPath" ADD CONSTRAINT "ApiPath_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
