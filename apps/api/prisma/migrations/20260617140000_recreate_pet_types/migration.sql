-- CreateTable
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

-- AddColumn
ALTER TABLE "products" ADD COLUMN "petTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_petTypeId_fkey"
  FOREIGN KEY ("petTypeId") REFERENCES "pet_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_petTypeId_idx" ON "products"("petTypeId");
