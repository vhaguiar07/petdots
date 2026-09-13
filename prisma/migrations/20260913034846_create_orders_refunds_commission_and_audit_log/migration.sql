-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PLACED', 'ACCEPTED', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "acquisition_channel" AS ENUM ('PLATFORM', 'STORE_REFERRAL');

-- CreateEnum
CREATE TYPE "item_fulfillment" AS ENUM ('FULFILLED', 'SUBSTITUTED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "order_rejection_reason" AS ENUM ('STORE_REJECTED', 'ACCEPTANCE_EXPIRED');

-- CreateEnum
CREATE TYPE "refund_reason" AS ENUM ('STORE_REJECTED', 'ACCEPTANCE_EXPIRED', 'TUTOR_CANCELLED', 'STORE_CANCELLED', 'ITEM_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "audit_actor_kind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "opening_hours" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "commission_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" "product_category" NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_commission_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "category" "product_category" NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "store_commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(6) NOT NULL,
    "tutor_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'PLACED',
    "acquisition_channel" "acquisition_channel" NOT NULL DEFAULT 'PLATFORM',
    "idempotency_key" UUID NOT NULL,
    "contact_name" VARCHAR(120) NOT NULL,
    "contact_phone" VARCHAR(16) NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "items_total_cents" INTEGER NOT NULL,
    "delivery_fee_cents" INTEGER NOT NULL,
    "service_fee_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "commission_total_cents" INTEGER NOT NULL,
    "placed_at" TIMESTAMPTZ NOT NULL,
    "acceptance_deadline_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "dispatched_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" "order_rejection_reason",
    "cancellation_reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "product_name_snapshot" VARCHAR(160) NOT NULL,
    "product_variant_snapshot" VARCHAR(60) NOT NULL,
    "category_snapshot" "product_category" NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "commission_rate_bps_snapshot" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL,
    "fulfillment" "item_fulfillment" NOT NULL DEFAULT 'FULFILLED',
    "substituted_by_product_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "reason" "refund_reason" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'PENDING',
    "psp_refund_id" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_kind" "audit_actor_kind" NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "store_id" UUID,
    "payload" JSONB NOT NULL,
    "request_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_rates_category_valid_from_key" ON "commission_rates"("category", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "store_commission_rates_store_id_category_valid_from_key" ON "store_commission_rates"("store_id", "category", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_store_id_status_placed_at_idx" ON "orders"("store_id", "status", "placed_at");

-- CreateIndex
CREATE INDEX "orders_tutor_id_placed_at_idx" ON "orders"("tutor_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_acceptance_deadline_at_idx" ON "orders"("status", "acceptance_deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tutor_id_idempotency_key_key" ON "orders"("tutor_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_psp_refund_id_key" ON "refunds"("psp_refund_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "store_commission_rates" ADD CONSTRAINT "store_commission_rates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Written by hand, as in the four migrations before this one: Prisma does not
-- model check constraints, and every rule below is an invariant of the
-- DOMAIN_MODEL rather than a preference. "Dinheiro em centavos inteiros
-- positivos é invariante… e é o banco quem a sustenta" (SYSTEM_ARCHITECTURE
-- §Dados, ADR-0004 #11).
--
-- 🔴 The first one is the most-cited invariant of the whole model: the total of
-- an order **is** its items plus delivery plus service. The application computes
-- it in one pure function (`orderTotals`), and this line is what guarantees that
-- a row written by a seed, a script or `prisma studio` cannot disagree with it.
-- Nothing here rounds, so the equality can be exact.
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_cents_check"
  CHECK ("total_cents" = "items_total_cents" + "delivery_fee_cents" + "service_fee_cents");
ALTER TABLE "orders" ADD CONSTRAINT "orders_items_total_cents_check" CHECK ("items_total_cents" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_fee_cents_check" CHECK ("delivery_fee_cents" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_fee_cents_check" CHECK ("service_fee_cents" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_commission_total_cents_check" CHECK ("commission_total_cents" >= 0);

-- A line of zero units is not an order line, and a price of zero is not a sale.
-- The contract refuses both at the border and the domain re-checks them in the
-- use case; these are what also hold for a row nobody validated.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_cents_check" CHECK ("unit_price_cents" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_commission_rate_bps_check"
  CHECK ("commission_rate_bps_snapshot" >= 0 AND "commission_rate_bps_snapshot" <= 10000);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_commission_amount_cents_check" CHECK ("commission_amount_cents" >= 0);

-- A refund of nothing is a row that means nothing: every exit that is not a
-- delivery moves money (ADR-0014, C5), so a zero here would be a bug that went
-- quiet instead of loud.
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_cents_check" CHECK ("amount_cents" > 0);

-- A take rate outside 0–100% is not a discount or a premium, it is a typo that
-- would move the partner's money in the wrong direction (ADR-0003).
ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_rate_bps_check"
  CHECK ("rate_bps" >= 0 AND "rate_bps" <= 10000);
ALTER TABLE "store_commission_rates" ADD CONSTRAINT "store_commission_rates_rate_bps_check"
  CHECK ("rate_bps" >= 0 AND "rate_bps" <= 10000);
-- A validity window that ends before it starts would silently never apply.
ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_validity_check"
  CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");
ALTER TABLE "store_commission_rates" ADD CONSTRAINT "store_commission_rates_validity_check"
  CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");

-- `opening_hours` is JSONB and the application parses it with Zod on the way
-- out, but JSONB accepts an object or a string just as happily. This is what
-- makes the column mean "a list of stretches" rather than "some JSON" — the
-- same reasoning as `tutors.postal_code` in the pd-14 migration. The shape of
-- each element stays with Zod: SQL is the wrong place for it.
ALTER TABLE "stores" ADD CONSTRAINT "stores_opening_hours_check"
  CHECK (jsonb_typeof("opening_hours") = 'array');
