/*
  Warnings:

  - You are about to drop the column `fusionAuthId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubAccessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_fusionAuthId_key";

-- DropIndex
DROP INDEX "users_githubId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "fusionAuthId",
DROP COLUMN "githubAccessToken",
DROP COLUMN "githubId";
