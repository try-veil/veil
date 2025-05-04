-- CreateTable
CREATE TABLE "_ProjectToApi" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectToApi_AB_unique" ON "_ProjectToApi"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectToApi_B_index" ON "_ProjectToApi"("B");

-- AddForeignKey
ALTER TABLE "project_allowed_apis" ADD CONSTRAINT "project_allowed_apis_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToApi" ADD CONSTRAINT "_ProjectToApi_A_fkey" FOREIGN KEY ("A") REFERENCES "apis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToApi" ADD CONSTRAINT "_ProjectToApi_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
