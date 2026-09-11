-- CreateEnum
CREATE TYPE "waitlist_source" AS ENUM ('CAMPAIGN', 'OUT_OF_AREA', 'STORE_QR');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "neighborhood" VARCHAR(80) NOT NULL,
    "postal_code" CHAR(8) NOT NULL,
    "pet_food_declared" VARCHAR(120),
    "source" "waitlist_source" NOT NULL,
    "consent_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_phone_key" ON "waitlist_entries"("phone");
