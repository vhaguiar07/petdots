-- CreateTable: pet_types (replaces PetType enum on products)
CREATE TABLE "pet_types" (
  "id"        TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "slug"      TEXT         NOT NULL,
  "emoji"     TEXT         NOT NULL DEFAULT '🐾',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pet_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pet_types_name_key" ON "pet_types"("name");
CREATE UNIQUE INDEX "pet_types_slug_key" ON "pet_types"("slug");

-- Seed initial pet types (ids are stable so data migration below works)
INSERT INTO "pet_types" ("id", "name", "slug", "emoji") VALUES
  ('pt_dog',  'Cães',   'caes',   '🐶'),
  ('pt_cat',  'Gatos',  'gatos',  '🐱'),
  ('pt_bird', 'Aves',   'aves',   '🐦'),
  ('pt_fish', 'Peixes', 'peixes', '🐠');

-- AddColumn petTypeId to products
ALTER TABLE "products" ADD COLUMN "petTypeId" TEXT;

-- Migrate existing enum values to FK
UPDATE "products" SET "petTypeId" = 'pt_dog'  WHERE "petType" = 'DOG';
UPDATE "products" SET "petTypeId" = 'pt_cat'  WHERE "petType" = 'CAT';
UPDATE "products" SET "petTypeId" = 'pt_bird' WHERE "petType" = 'BIRD';
UPDATE "products" SET "petTypeId" = 'pt_fish' WHERE "petType" = 'FISH';

-- Drop old column and enum
ALTER TABLE "products" DROP COLUMN "petType";
DROP TYPE IF EXISTS "PetType";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_petTypeId_fkey"
  FOREIGN KEY ("petTypeId") REFERENCES "pet_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_petTypeId_idx" ON "products"("petTypeId");
