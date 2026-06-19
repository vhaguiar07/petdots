-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_petTypeId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "products_petTypeId_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN IF EXISTS "petTypeId";

-- DropTable
DROP TABLE IF EXISTS "pet_types";
