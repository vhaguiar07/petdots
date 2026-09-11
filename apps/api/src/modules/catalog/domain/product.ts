import type { ProductCategory } from '@petdots/contracts';

/**
 * An item of the master catalogue (DOMAIN_MODEL §Produto). The platform curates
 * it; a store only declares an `Offer` over it.
 */
export interface Product {
  id: string;
  slug: string;
  ean: string | null;
  name: string;
  brand: string;
  category: ProductCategory;
  variant: string;
  netWeightGrams: number;
  imageUrl: string | null;
  requiresPrescription: boolean;
  active: boolean;
}
