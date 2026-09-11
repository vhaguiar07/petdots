import type { Product } from './product.js';

/** Injection token for the port — the domain never names its adapter. */
export const PRODUCT_REPOSITORY = Symbol('IProductRepository');

export interface ProductSearch {
  /** Already normalised and split by the domain; AND-ed by the adapter. */
  tokens: readonly string[];
  slug?: string;
  page: number;
  pageSize: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
}

export interface IProductRepository {
  search(query: ProductSearch): Promise<ProductPage>;
  findById(id: string): Promise<Product | null>;
}
