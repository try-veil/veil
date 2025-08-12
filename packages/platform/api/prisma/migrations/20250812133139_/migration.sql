-- AlterTable
ALTER TABLE "apis" ADD COLUMN     "bodyConfig" JSONB,
ADD COLUMN     "queryParams" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "grafanaDashboardUid" TEXT;

-- DropEnum
DROP TYPE "LoadBalancerStrategy";

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");
