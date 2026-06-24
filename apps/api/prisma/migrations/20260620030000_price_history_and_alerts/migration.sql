-- CreateTable: price_history
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: price_alerts
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "targetPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_history_storeProductId_recordedAt_idx" ON "price_history"("storeProductId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "price_alerts_userId_catalogProductId_key" ON "price_alerts"("userId", "catalogProductId");

-- CreateIndex
CREATE INDEX "price_alerts_catalogProductId_isActive_idx" ON "price_alerts"("catalogProductId", "isActive");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
