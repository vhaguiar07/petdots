/**
 * Script de verificação pós-migração para o catálogo compartilhado.
 *
 * Executa após a migration SQL `20260620000000_shared_catalog` e confirma
 * que todos os dados foram migrados com integridade referencial.
 *
 * Uso:
 *   npx ts-node --project tsconfig.json prisma/seed-migration.ts
 *
 * Saída: relatório de consistência com totais e erros encontrados.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

async function main() {
  console.log('=== Verificação pós-migração: Catálogo Compartilhado ===\n');

  const results: CheckResult[] = [];

  // ---------------------------------------------------------------------------
  // 1. Totais das novas tabelas
  // ---------------------------------------------------------------------------

  const [catalogCount, storeProductCount, catalogImageCount] = await Promise.all([
    prisma.catalogProduct.count(),
    prisma.storeProduct.count(),
    prisma.catalogProductImage.count(),
  ]);

  console.log('Totais nas novas tabelas:');
  console.log(`  catalog_products       : ${catalogCount}`);
  console.log(`  store_products         : ${storeProductCount}`);
  console.log(`  catalog_product_images : ${catalogImageCount}`);
  console.log();

  // ---------------------------------------------------------------------------
  // 2. Verificar que todo StoreProduct tem um CatalogProduct correspondente
  // ---------------------------------------------------------------------------

  const orphanStoreProducts = await prisma.storeProduct.count({
    where: { catalogProduct: { is: undefined } },
  });

  results.push({
    check: 'StoreProducts sem CatalogProduct',
    passed: orphanStoreProducts === 0,
    detail: orphanStoreProducts === 0
      ? 'Nenhum encontrado'
      : `${orphanStoreProducts} StoreProducts órfãos`,
  });

  // ---------------------------------------------------------------------------
  // 3. Verificar que todo OrderItem tem um StoreProduct válido
  // ---------------------------------------------------------------------------

  const orderItemCount = await prisma.orderItem.count();
  const orderItemsWithProduct = await prisma.orderItem.count({
    where: { storeProduct: { isNot: undefined } },
  });

  results.push({
    check: 'OrderItems com StoreProduct válido',
    passed: orderItemCount === orderItemsWithProduct,
    detail: `${orderItemsWithProduct}/${orderItemCount} itens com referência válida`,
  });

  // ---------------------------------------------------------------------------
  // 4. Verificar que toda ProductReview tem um StoreProduct válido
  // ---------------------------------------------------------------------------

  const reviewCount = await prisma.productReview.count();
  const reviewsWithProduct = await prisma.productReview.count({
    where: { storeProduct: { isNot: undefined } },
  });

  results.push({
    check: 'ProductReviews com StoreProduct válido',
    passed: reviewCount === reviewsWithProduct,
    detail: `${reviewsWithProduct}/${reviewCount} reviews com referência válida`,
  });

  // ---------------------------------------------------------------------------
  // 5. Verificar unique constraint: um lojista não pode ter o mesmo produto duas vezes
  // ---------------------------------------------------------------------------

  const duplicates = await prisma.$queryRaw<{ storeId: string; catalogProductId: string; count: bigint }[]>`
    SELECT "storeId", "catalogProductId", COUNT(*) as count
    FROM store_products
    GROUP BY "storeId", "catalogProductId"
    HAVING COUNT(*) > 1
  `;

  results.push({
    check: 'Duplicatas em store_products (storeId + catalogProductId)',
    passed: duplicates.length === 0,
    detail: duplicates.length === 0
      ? 'Nenhuma duplicata encontrada'
      : `${duplicates.length} combinações duplicadas encontradas`,
  });

  // ---------------------------------------------------------------------------
  // 6. Verificar que toda promoção com storeProductId tem referência válida
  // ---------------------------------------------------------------------------

  const promotionsTotal = await prisma.promotion.count({ where: { storeProductId: { not: null } } });
  const promotionsValid = await prisma.promotion.count({
    where: {
      storeProductId: { not: null },
      storeProduct: { isNot: undefined },
    },
  });

  results.push({
    check: 'Promoções de produto com StoreProduct válido',
    passed: promotionsTotal === promotionsValid,
    detail: `${promotionsValid}/${promotionsTotal} promoções com referência válida`,
  });

  // ---------------------------------------------------------------------------
  // 7. Verificar que StoreProduct.price não tem valores negativos
  // ---------------------------------------------------------------------------

  const negativePrices = await prisma.storeProduct.count({
    where: { price: { lt: 0 } },
  });

  results.push({
    check: 'StoreProducts com preço negativo',
    passed: negativePrices === 0,
    detail: negativePrices === 0 ? 'Nenhum encontrado' : `${negativePrices} produtos com preço negativo`,
  });

  // ---------------------------------------------------------------------------
  // 8. Verificar que StoreProduct.stock não tem valores negativos
  // ---------------------------------------------------------------------------

  const negativeStock = await prisma.storeProduct.count({
    where: { stock: { lt: 0 } },
  });

  results.push({
    check: 'StoreProducts com estoque negativo',
    passed: negativeStock === 0,
    detail: negativeStock === 0 ? 'Nenhum encontrado' : `${negativeStock} produtos com estoque negativo`,
  });

  // ---------------------------------------------------------------------------
  // 9. Verificar que CatalogProducts sem storeProducts existem
  //    (catálogos sem nenhuma loja vendendo — situação possível mas vale saber)
  // ---------------------------------------------------------------------------

  const catalogWithNoOffers = await prisma.catalogProduct.count({
    where: { storeProducts: { none: {} } },
  });

  results.push({
    check: 'CatalogProducts sem nenhum StoreProduct (aviso)',
    passed: true,  // não é erro, apenas informativo
    detail: `${catalogWithNoOffers} produtos no catálogo sem oferta ativa de loja`,
  });

  // ---------------------------------------------------------------------------
  // 10. Verificar integridade das imagens do catálogo
  // ---------------------------------------------------------------------------

  const imagesWithoutProduct = await prisma.catalogProductImage.count({
    where: { catalogProduct: { is: undefined } },
  });

  results.push({
    check: 'CatalogProductImages sem produto associado',
    passed: imagesWithoutProduct === 0,
    detail: imagesWithoutProduct === 0
      ? 'Nenhuma imagem órfã'
      : `${imagesWithoutProduct} imagens sem CatalogProduct`,
  });

  // ---------------------------------------------------------------------------
  // Relatório final
  // ---------------------------------------------------------------------------

  console.log('Resultados das verificações:');
  console.log('─'.repeat(70));

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    const status = result.passed ? 'OK  ' : 'FAIL';
    if (!result.passed) allPassed = false;
    console.log(`  [${icon}] ${status} │ ${result.check}`);
    console.log(`           │ ${result.detail}`);
    console.log();
  }

  console.log('─'.repeat(70));

  if (allPassed) {
    console.log('\n✓ Migração verificada com sucesso. Todos os checks passaram.\n');
    process.exit(0);
  } else {
    const failed = results.filter((r) => !r.passed).length;
    console.log(`\n✗ ${failed} check(s) falharam. Revise os dados antes de prosseguir.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erro durante a verificação:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
