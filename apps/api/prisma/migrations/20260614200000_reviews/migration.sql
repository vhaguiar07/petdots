-- Avaliações de produtos e lojas (uma por cliente, exige compra entregue)

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "stores" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "products" ADD COLUMN "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ownerReply" TEXT,
    "ownerRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_reviews" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ownerReply" TEXT,
    "ownerRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_productId_customerId_key" ON "product_reviews"("productId", "customerId");
CREATE INDEX "product_reviews_productId_idx" ON "product_reviews"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "store_reviews_storeId_customerId_key" ON "store_reviews"("storeId", "customerId");
CREATE INDEX "store_reviews_storeId_idx" ON "store_reviews"("storeId");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: rating must be between 1 and 5
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
