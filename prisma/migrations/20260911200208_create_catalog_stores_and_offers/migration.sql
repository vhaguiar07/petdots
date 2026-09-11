-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('FOOD_STANDARD', 'FOOD_PREMIUM', 'TREAT', 'HYGIENE', 'HEALTH_OTC', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "store_status" AS ENUM ('PROSPECT', 'ONBOARDING', 'ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ean" VARCHAR(14),
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "category" "product_category" NOT NULL,
    "variant" VARCHAR(60) NOT NULL,
    "net_weight_grams" INTEGER NOT NULL,
    "image_url" VARCHAR(500),
    "requires_prescription" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "search_text" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "neighborhood" VARCHAR(80) NOT NULL,
    "status" "store_status" NOT NULL DEFAULT 'PROSPECT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "neighborhoods" TEXT[],
    "postal_code_ranges" JSONB NOT NULL,
    "delivery_fee_cents" INTEGER NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "delivery_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "price_updated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_ean_key" ON "products"("ean");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "delivery_areas_active_idx" ON "delivery_areas"("active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_areas_store_id_label_key" ON "delivery_areas"("store_id", "label");

-- CreateIndex
CREATE INDEX "offers_product_id_available_idx" ON "offers"("product_id", "available");

-- CreateIndex
CREATE UNIQUE INDEX "offers_store_id_product_id_key" ON "offers"("store_id", "product_id");

-- AddForeignKey
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written by hand: Prisma does not model check constraints, and the migration
-- is plain SQL. Money in positive integer cents is an invariant of ADR-0004 #11
-- and the database is what sustains it — an offer at zero is a data error, not
-- a promotion, and a bag that weighs nothing breaks the price per kilo.
-- A delivery fee of zero is legitimate (free delivery), so that one is >= 0.
ALTER TABLE "products" ADD CONSTRAINT "products_net_weight_grams_check" CHECK ("net_weight_grams" > 0);
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_delivery_fee_cents_check" CHECK ("delivery_fee_cents" >= 0);
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_estimated_minutes_check" CHECK ("estimated_minutes" > 0);
ALTER TABLE "offers" ADD CONSTRAINT "offers_price_cents_check" CHECK ("price_cents" > 0);
