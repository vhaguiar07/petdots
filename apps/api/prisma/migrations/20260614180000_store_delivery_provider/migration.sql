-- Replace Store.deliveryMode (StoreDeliveryMode: SELF/PARTNER/BOTH, unused) with
-- Store.deliveryProvider (DeliveryProviderType: SELF/EXTERNAL), reusing the enum
-- already used by the Delivery model.

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "deliveryProvider" "DeliveryProviderType" NOT NULL DEFAULT 'SELF';

ALTER TABLE "stores" DROP COLUMN "deliveryMode";

-- DropEnum
DROP TYPE "StoreDeliveryMode";
