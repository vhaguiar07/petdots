-- AlterTable
ALTER TABLE "stores" DROP COLUMN "businessHours";
ALTER TABLE "stores" DROP COLUMN "businessHoursSunday";
ALTER TABLE "stores" ADD COLUMN "businessHours" JSONB;
