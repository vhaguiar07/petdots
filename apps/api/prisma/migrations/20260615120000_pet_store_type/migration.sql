-- CreateEnum
CREATE TYPE "PetType" AS ENUM ('DOG', 'CAT', 'BIRD', 'FISH');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('PETSHOP', 'VET_CLINIC', 'GROOMING', 'SPECIALTY');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "petType" "PetType";

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "storeType" "StoreType";

-- CreateIndex
CREATE INDEX "products_petType_idx" ON "products"("petType");
