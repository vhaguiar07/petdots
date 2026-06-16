-- AlterTable
ALTER TABLE "promotions" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "couponCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "promotions_storeId_code_key" ON "promotions"("storeId", "code");
