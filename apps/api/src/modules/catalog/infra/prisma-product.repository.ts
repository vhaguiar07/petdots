import { Injectable } from '@nestjs/common';
import type { Prisma, Product as PrismaProduct } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  IProductRepository,
  ProductPage,
  ProductSearch,
} from '../domain/iproduct.repository.js';
import type { Product } from '../domain/product.js';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Searches by substring over the pre-folded `search_text` column.
   *
   * Not `tsvector` (ADR-0010, A5): for a catalogue of dozens of SKUs, full text
   * plus `unaccent` — which needs an `IMMUTABLE` wrapper to be usable in a
   * generated column — is infrastructure ahead of the need. The column is
   * written by `normalizeSearchText` and the term is read by the same function,
   * so accent and case are already gone on both sides and a plain `LIKE` is
   * both enough and deterministic. Trigger to revisit: a catalogue above ~500
   * SKUs, or measured bad search quality.
   *
   * `contains` escapes `%` and `_` on its own — never build the `LIKE` by hand.
   * There is no index for `%term%`; that is the same trigger.
   */
  async search(query: ProductSearch): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(query.slug ? { slug: query.slug } : {}),
      AND: query.tokens.map((token) => ({ searchText: { contains: token } })),
    };

    // One round trip: the page and its total have to describe the same filter.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }, { netWeightGrams: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rows.map(toProduct), total };
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });

    return row ? toProduct(row) : null;
  }
}

function toProduct(row: PrismaProduct): Product {
  return {
    id: row.id,
    slug: row.slug,
    ean: row.ean,
    name: row.name,
    brand: row.brand,
    category: row.category,
    variant: row.variant,
    netWeightGrams: row.netWeightGrams,
    imageUrl: row.imageUrl,
    requiresPrescription: row.requiresPrescription,
    active: row.active,
  };
}
