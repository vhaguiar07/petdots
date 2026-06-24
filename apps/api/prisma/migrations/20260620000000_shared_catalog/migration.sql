-- =============================================================================
-- Migração: Catálogo Compartilhado de Produtos
--
-- O modelo antigo tinha Product diretamente ligado a storeId. Agora existe:
--   CatalogProduct  → produto global (existe uma vez no catálogo)
--   StoreProduct    → oferta de um lojista (preço, estoque, descrição custom)
--
-- Estratégia de migração de dados:
--   • CatalogProduct.id  = Product.id original (1:1, reutiliza o mesmo id)
--   • StoreProduct.id    = 'sp_' || Product.id (determinístico, permite updates de FK)
--
-- Ordem de operações:
--   1. Criar enum e novas tabelas
--   2. Migrar dados: products → catalog_products + store_products
--   3. Migrar imagens: product_images → catalog_product_images
--   4. Adicionar coluna storeProductId nas tabelas dependentes e preencher
--   5. Criar novos índices e FKs
--   6. Remover antigas FKs, colunas e tabelas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Novo enum
-- -----------------------------------------------------------------------------

CREATE TYPE "CatalogProductStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'REJECTED');

-- -----------------------------------------------------------------------------
-- 2. Novas tabelas
-- -----------------------------------------------------------------------------

CREATE TABLE "catalog_products" (
    "id"               TEXT                    NOT NULL,
    "createdByStoreId" TEXT                    NOT NULL,
    "categoryId"       TEXT,
    "petTypeId"        TEXT,
    "name"             TEXT                    NOT NULL,
    "brand"            TEXT,
    "barcode"          TEXT,
    "description"      TEXT,
    "status"           "CatalogProductStatus"  NOT NULL DEFAULT 'ACTIVE',
    "createdAt"        TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)            NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_product_images" (
    "id"               TEXT         NOT NULL,
    "catalogProductId" TEXT         NOT NULL,
    "url"              TEXT         NOT NULL,
    "position"         INTEGER      NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_products" (
    "id"                TEXT         NOT NULL,
    "storeId"           TEXT         NOT NULL,
    "catalogProductId"  TEXT         NOT NULL,
    "price"             DECIMAL(10,2) NOT NULL,
    "stock"             INTEGER      NOT NULL DEFAULT 0,
    "customDescription" TEXT,
    "isActive"          BOOLEAN      NOT NULL DEFAULT true,
    "avgRating"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount"       INTEGER      NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- 3. Migrar dados: products → catalog_products
--    Reutiliza o mesmo id para mapeamento direto.
-- -----------------------------------------------------------------------------

INSERT INTO "catalog_products" (
    "id",
    "createdByStoreId",
    "categoryId",
    "petTypeId",
    "name",
    "description",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    p."id",
    p."storeId",
    p."categoryId",
    p."petTypeId",
    p."name",
    p."description",
    'ACTIVE'::"CatalogProductStatus",
    p."createdAt",
    p."updatedAt"
FROM "products" p;

-- -----------------------------------------------------------------------------
-- 4. Migrar imagens: product_images → catalog_product_images
-- -----------------------------------------------------------------------------

INSERT INTO "catalog_product_images" (
    "id",
    "catalogProductId",
    "url",
    "position",
    "createdAt"
)
SELECT
    pi."id",
    pi."productId",
    pi."url",
    pi."position",
    pi."createdAt"
FROM "product_images" pi;

-- -----------------------------------------------------------------------------
-- 5. Migrar dados: products → store_products
--    StoreProduct.id = 'sp_' || Product.id para permitir updates determinísticos
--    nas tabelas que referenciam o produto.
-- -----------------------------------------------------------------------------

INSERT INTO "store_products" (
    "id",
    "storeId",
    "catalogProductId",
    "price",
    "stock",
    "customDescription",
    "isActive",
    "avgRating",
    "reviewCount",
    "createdAt",
    "updatedAt"
)
SELECT
    'sp_' || p."id",
    p."storeId",
    p."id",
    p."price",
    p."stock",
    NULL,
    p."isActive",
    p."avgRating",
    p."reviewCount",
    p."createdAt",
    p."updatedAt"
FROM "products" p;

-- -----------------------------------------------------------------------------
-- 6. Índices e FKs das novas tabelas
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX "catalog_products_barcode_key"
    ON "catalog_products"("barcode");

CREATE INDEX "catalog_products_createdByStoreId_idx"
    ON "catalog_products"("createdByStoreId");

CREATE INDEX "catalog_products_categoryId_idx"
    ON "catalog_products"("categoryId");

CREATE INDEX "catalog_products_petTypeId_idx"
    ON "catalog_products"("petTypeId");

CREATE INDEX "catalog_product_images_catalogProductId_idx"
    ON "catalog_product_images"("catalogProductId");

CREATE UNIQUE INDEX "store_products_storeId_catalogProductId_key"
    ON "store_products"("storeId", "catalogProductId");

CREATE INDEX "store_products_storeId_idx"
    ON "store_products"("storeId");

CREATE INDEX "store_products_catalogProductId_idx"
    ON "store_products"("catalogProductId");

ALTER TABLE "catalog_products"
    ADD CONSTRAINT "catalog_products_createdByStoreId_fkey"
    FOREIGN KEY ("createdByStoreId") REFERENCES "stores"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_products"
    ADD CONSTRAINT "catalog_products_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "catalog_products"
    ADD CONSTRAINT "catalog_products_petTypeId_fkey"
    FOREIGN KEY ("petTypeId") REFERENCES "pet_types"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "catalog_product_images"
    ADD CONSTRAINT "catalog_product_images_catalogProductId_fkey"
    FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_products"
    ADD CONSTRAINT "store_products_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_products"
    ADD CONSTRAINT "store_products_catalogProductId_fkey"
    FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 7. order_items: adicionar storeProductId, preencher, tornar NOT NULL
-- -----------------------------------------------------------------------------

ALTER TABLE "order_items" ADD COLUMN "storeProductId" TEXT;

UPDATE "order_items"
SET "storeProductId" = 'sp_' || "productId";

ALTER TABLE "order_items" ALTER COLUMN "storeProductId" SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 8. promotions: adicionar storeProductId, preencher (nullable)
-- -----------------------------------------------------------------------------

ALTER TABLE "promotions" ADD COLUMN "storeProductId" TEXT;

UPDATE "promotions"
SET "storeProductId" = 'sp_' || "productId"
WHERE "productId" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 9. product_reviews: adicionar storeProductId, preencher, tornar NOT NULL
-- -----------------------------------------------------------------------------

ALTER TABLE "product_reviews" ADD COLUMN "storeProductId" TEXT;

UPDATE "product_reviews"
SET "storeProductId" = 'sp_' || "productId";

ALTER TABLE "product_reviews" ALTER COLUMN "storeProductId" SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 10. Remover índices antigos de product_reviews e promotions
-- -----------------------------------------------------------------------------

DROP INDEX "product_reviews_productId_customerId_key";
DROP INDEX "product_reviews_productId_idx";
DROP INDEX "promotions_productId_idx";

-- -----------------------------------------------------------------------------
-- 11. Criar novos índices para as colunas migradas
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX "product_reviews_storeProductId_customerId_key"
    ON "product_reviews"("storeProductId", "customerId");

CREATE INDEX "product_reviews_storeProductId_idx"
    ON "product_reviews"("storeProductId");

CREATE INDEX "promotions_storeProductId_idx"
    ON "promotions"("storeProductId");

-- -----------------------------------------------------------------------------
-- 12. Adicionar novas FKs nas tabelas dependentes
-- -----------------------------------------------------------------------------

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_storeProductId_fkey"
    FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotions"
    ADD CONSTRAINT "promotions_storeProductId_fkey"
    FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_reviews"
    ADD CONSTRAINT "product_reviews_storeProductId_fkey"
    FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 13. Remover antigas FKs que apontavam para products
-- -----------------------------------------------------------------------------

ALTER TABLE "order_items"    DROP CONSTRAINT "order_items_productId_fkey";
ALTER TABLE "promotions"     DROP CONSTRAINT "promotions_productId_fkey";
ALTER TABLE "product_reviews" DROP CONSTRAINT "product_reviews_productId_fkey";

-- -----------------------------------------------------------------------------
-- 14. Remover antigas colunas productId
-- -----------------------------------------------------------------------------

ALTER TABLE "order_items"     DROP COLUMN "productId";
ALTER TABLE "promotions"      DROP COLUMN "productId";
ALTER TABLE "product_reviews" DROP COLUMN "productId";

-- -----------------------------------------------------------------------------
-- 15. Remover tabelas antigas
--     product_images primeiro (tem FK para products), depois products.
-- -----------------------------------------------------------------------------

DROP TABLE "product_images";
DROP TABLE "products";
