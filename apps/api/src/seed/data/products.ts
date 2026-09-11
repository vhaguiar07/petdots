import type { ProductCategory } from '@petdots/contracts';

import type { SeedProduct } from '../types.js';

/**
 * Initial pilot catalogue — the brands and pack sizes a Grande Méier petshop
 * actually stocks, carried over from the pd-08 spike.
 *
 * **Every `ean` is null, and that is deliberate.** The DOMAIN_MODEL invariant is
 * "unique when present", and admits a product without one "with manual curation
 * and explicit marking". Inventing barcodes would satisfy the constraint while
 * lying about the data. Victor has to check the real codes on the shelf before
 * they enter — it is on his manual-intervention list in the BACKLOG.
 *
 * No item here requires a prescription: prescription products cannot be offered
 * in the MVP (IDEACAO §24) and the comparator has nothing to show for them.
 */
interface CatalogueEntry {
  brand: string;
  name: string;
  category: ProductCategory;
  variants: { variant: string; netWeightGrams: number }[];
}

const CATALOGUE: CatalogueEntry[] = [
  {
    brand: 'Golden',
    name: 'Golden Fórmula Cães Adultos Frango e Arroz',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '3 kg', netWeightGrams: 3000 },
      { variant: '15 kg', netWeightGrams: 15000 },
      { variant: '20 kg', netWeightGrams: 20000 },
    ],
  },
  {
    brand: 'Premier',
    name: 'Premier Raças Específicas Cães Adultos',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '2,5 kg', netWeightGrams: 2500 },
      { variant: '12 kg', netWeightGrams: 12000 },
    ],
  },
  {
    brand: 'Royal Canin',
    name: 'Royal Canin Medium Adult',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '2,5 kg', netWeightGrams: 2500 },
      { variant: '10,1 kg', netWeightGrams: 10100 },
      { variant: '15 kg', netWeightGrams: 15000 },
    ],
  },
  {
    brand: 'Royal Canin',
    name: 'Royal Canin Feline Indoor',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '1,5 kg', netWeightGrams: 1500 },
      { variant: '7,5 kg', netWeightGrams: 7500 },
    ],
  },
  {
    brand: 'Pedigree',
    name: 'Pedigree Cães Adultos Carne',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '1 kg', netWeightGrams: 1000 },
      { variant: '10,1 kg', netWeightGrams: 10100 },
      { variant: '20 kg', netWeightGrams: 20000 },
    ],
  },
  {
    brand: 'Whiskas',
    name: 'Whiskas Gatos Adultos Carne',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '900 g', netWeightGrams: 900 },
      { variant: '3 kg', netWeightGrams: 3000 },
      { variant: '10,1 kg', netWeightGrams: 10100 },
    ],
  },
  {
    brand: 'Foster',
    name: 'Foster Cães Adultos Raças Pequenas',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '1 kg', netWeightGrams: 1000 },
      { variant: '15 kg', netWeightGrams: 15000 },
    ],
  },
  {
    brand: 'Magnus',
    name: 'Magnus Todo Dia Cães Adultos',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '15 kg', netWeightGrams: 15000 },
      { variant: '25 kg', netWeightGrams: 25000 },
    ],
  },
  {
    brand: 'GranPlus',
    name: 'GranPlus Menu Gatos Castrados Salmão',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '1 kg', netWeightGrams: 1000 },
      { variant: '10,1 kg', netWeightGrams: 10100 },
    ],
  },
  {
    brand: 'Pipicat',
    name: 'Pipicat Areia Sanitária Classic',
    category: 'HYGIENE',
    variants: [
      { variant: '4 kg', netWeightGrams: 4000 },
      { variant: '12 kg', netWeightGrams: 12000 },
    ],
  },
  {
    brand: 'Kelco',
    name: 'Kelco Areia Higiênica Grãos Finos',
    category: 'HYGIENE',
    variants: [
      { variant: '4 kg', netWeightGrams: 4000 },
      { variant: '10 kg', netWeightGrams: 10000 },
    ],
  },
  {
    brand: 'Sanol',
    name: 'Sanol Dog Tapete Higiênico',
    category: 'HYGIENE',
    variants: [
      { variant: '30 unidades', netWeightGrams: 2400 },
      { variant: '50 unidades', netWeightGrams: 4000 },
    ],
  },
  {
    brand: 'Bayer',
    name: 'Bayer Advantage Max3 Antipulgas Cães',
    category: 'HEALTH_OTC',
    variants: [
      { variant: '1 a 4 kg', netWeightGrams: 40 },
      { variant: '4 a 10 kg', netWeightGrams: 100 },
      { variant: '10 a 25 kg', netWeightGrams: 250 },
    ],
  },
  {
    brand: 'Ceva',
    name: 'Ceva Vectra 3D Antipulgas e Carrapatos',
    category: 'HEALTH_OTC',
    variants: [
      { variant: '1,5 a 4 kg', netWeightGrams: 36 },
      { variant: '10 a 25 kg', netWeightGrams: 180 },
    ],
  },
  {
    brand: 'Elanco',
    name: 'Elanco Credelio Antipulgas Comprimido',
    category: 'HEALTH_OTC',
    variants: [
      { variant: '2,5 a 5,5 kg', netWeightGrams: 12 },
      { variant: '11 a 22 kg', netWeightGrams: 24 },
    ],
  },
  {
    brand: 'Bayer',
    name: 'Bayer Drontal Plus Vermífugo',
    category: 'HEALTH_OTC',
    variants: [
      { variant: '4 comprimidos', netWeightGrams: 16 },
      { variant: '6 comprimidos', netWeightGrams: 24 },
    ],
  },
  {
    brand: 'Golden',
    name: 'Golden Petisco Bifinho Carne',
    category: 'TREAT',
    variants: [
      { variant: '65 g', netWeightGrams: 65 },
      { variant: '500 g', netWeightGrams: 500 },
    ],
  },
  {
    brand: 'Dog Chow',
    name: 'Dog Chow Extra Life Adultos Frango',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '10,1 kg', netWeightGrams: 10100 },
      { variant: '15 kg', netWeightGrams: 15000 },
    ],
  },
  {
    brand: 'Friskies',
    name: 'Friskies Gatos Adultos Mix',
    category: 'FOOD_STANDARD',
    variants: [
      { variant: '1 kg', netWeightGrams: 1000 },
      { variant: '3 kg', netWeightGrams: 3000 },
    ],
  },
  {
    brand: 'Nutrópica',
    name: 'Nutrópica Ração Super Premium Gatos Filhotes',
    category: 'FOOD_PREMIUM',
    variants: [
      { variant: '1 kg', netWeightGrams: 1000 },
      { variant: '3 kg', netWeightGrams: 3000 },
    ],
  },
  {
    brand: 'Ferplast',
    name: 'Ferplast Comedouro Inox Antiderrapante',
    category: 'ACCESSORY',
    variants: [
      { variant: '350 ml', netWeightGrams: 210 },
      { variant: '900 ml', netWeightGrams: 430 },
    ],
  },
  {
    brand: 'Chalesco',
    name: 'Chalesco Arranhador Torre para Gatos',
    category: 'ACCESSORY',
    variants: [{ variant: '60 cm', netWeightGrams: 2800 }],
  },
  {
    brand: 'Truqys',
    name: 'Truqys Coleira Peitoral Ajustável',
    category: 'ACCESSORY',
    variants: [
      { variant: 'M', netWeightGrams: 180 },
      { variant: 'G', netWeightGrams: 240 },
    ],
  },
  {
    brand: 'Sanol',
    name: 'Sanol Shampoo Neutro Cães e Gatos',
    category: 'HYGIENE',
    variants: [
      { variant: '500 ml', netWeightGrams: 500 },
      { variant: '5 litros', netWeightGrams: 5000 },
    ],
  },
];

export const PRODUCTS: readonly SeedProduct[] = CATALOGUE.flatMap((entry) =>
  entry.variants.map((variant): SeedProduct => ({
    name: entry.name,
    brand: entry.brand,
    category: entry.category,
    variant: variant.variant,
    netWeightGrams: variant.netWeightGrams,
    ean: null,
    imageUrl: null,
    requiresPrescription: false,
    active: true,
  })),
);
