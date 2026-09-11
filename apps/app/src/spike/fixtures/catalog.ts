import type { DeliveryArea, Product, ProductCategory, Store } from './types';

/**
 * Eight stores on the Grande Méier axis — the pilot territory. Neighbourhoods
 * and postal ranges are real so the comparator is judged on real column widths;
 * `lorem ipsum` lies about how wide a name gets.
 */
type StoreSeed = {
  id: string;
  name: string;
  neighborhood: string;
  areas: {
    label: string;
    neighborhoods: string[];
    postalCodeRanges: { from: string; to: string }[];
    deliveryFeeCents: number;
    estimatedMinutes: number;
  }[];
};

const STORE_SEEDS: StoreSeed[] = [
  {
    id: 'sto-meier-centro',
    name: 'Petshop Amigo Fiel',
    neighborhood: 'Méier',
    areas: [
      {
        label: 'Méier e vizinhos',
        neighborhoods: ['Méier', 'Todos os Santos', 'Engenho de Dentro'],
        postalCodeRanges: [{ from: '20710000', to: '20775999' }],
        deliveryFeeCents: 690,
        estimatedMinutes: 45,
      },
      {
        label: 'Borda norte',
        neighborhoods: ['Cachambi', 'Abolição'],
        postalCodeRanges: [{ from: '20775000', to: '20785999' }],
        deliveryFeeCents: 990,
        estimatedMinutes: 70,
      },
    ],
  },
  {
    id: 'sto-engenho-novo',
    name: 'Mundo Pet Engenho Novo',
    neighborhood: 'Engenho Novo',
    areas: [
      {
        label: 'Engenho Novo e Riachuelo',
        neighborhoods: ['Engenho Novo', 'Riachuelo', 'Rocha', 'Sampaio'],
        postalCodeRanges: [{ from: '20710000', to: '20960999' }],
        deliveryFeeCents: 590,
        estimatedMinutes: 40,
      },
    ],
  },
  {
    id: 'sto-cachambi',
    name: 'Casa dos Bichos Cachambi',
    neighborhood: 'Cachambi',
    areas: [
      {
        label: 'Cachambi e Méier',
        neighborhoods: ['Cachambi', 'Méier', 'Todos os Santos', 'Jacaré'],
        postalCodeRanges: [{ from: '20720000', to: '20785999' }],
        deliveryFeeCents: 750,
        estimatedMinutes: 55,
      },
    ],
  },
  {
    id: 'sto-todos-os-santos',
    name: 'Ração & Cia Todos os Santos',
    neighborhood: 'Todos os Santos',
    areas: [
      {
        label: 'Todos os Santos e entorno',
        neighborhoods: ['Todos os Santos', 'Méier', 'Engenho de Dentro', 'Água Santa'],
        postalCodeRanges: [{ from: '20720000', to: '20770999' }],
        deliveryFeeCents: 490,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    id: 'sto-lins',
    name: 'Pet Lins',
    neighborhood: 'Lins de Vasconcelos',
    areas: [
      {
        label: 'Lins e encosta',
        neighborhoods: ['Lins de Vasconcelos', 'Engenho Novo', 'Água Santa'],
        postalCodeRanges: [{ from: '20710000', to: '20735999' }],
        deliveryFeeCents: 890,
        estimatedMinutes: 50,
      },
    ],
  },
  {
    id: 'sto-piedade',
    name: 'Petshop Bicho Solto',
    neighborhood: 'Piedade',
    areas: [
      {
        label: 'Piedade e Encantado',
        neighborhoods: ['Piedade', 'Encantado', 'Água Santa', 'Pilares'],
        postalCodeRanges: [{ from: '20740000', to: '20775999' }],
        deliveryFeeCents: 690,
        estimatedMinutes: 65,
      },
    ],
  },
  {
    id: 'sto-engenho-de-dentro',
    name: 'Agropet Engenho de Dentro',
    neighborhood: 'Engenho de Dentro',
    areas: [
      {
        label: 'Engenho de Dentro e Méier',
        neighborhoods: ['Engenho de Dentro', 'Méier', 'Cachambi', 'Abolição'],
        postalCodeRanges: [{ from: '20720000', to: '20785999' }],
        deliveryFeeCents: 590,
        estimatedMinutes: 45,
      },
    ],
  },
  {
    id: 'sto-riachuelo',
    name: 'Focinho Feliz Riachuelo',
    neighborhood: 'Riachuelo',
    areas: [
      {
        label: 'Riachuelo, Rocha e Sampaio',
        neighborhoods: ['Riachuelo', 'Rocha', 'Sampaio', 'Jacaré'],
        postalCodeRanges: [{ from: '20770000', to: '20960999' }],
        deliveryFeeCents: 790,
        estimatedMinutes: 55,
      },
    ],
  },
];

export const STORES: readonly Store[] = STORE_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  neighborhood: seed.neighborhood,
  deliveryAreas: seed.areas.map(
    (area, index): DeliveryArea => ({
      id: `${seed.id}-area-${index + 1}`,
      storeId: seed.id,
      label: area.label,
      neighborhoods: area.neighborhoods,
      postalCodeRanges: area.postalCodeRanges,
      deliveryFeeCents: area.deliveryFeeCents,
      estimatedMinutes: area.estimatedMinutes,
      active: true,
    }),
  ),
}));

/**
 * Master catalogue. The plan fixes three floors that have to hold at the same
 * time: at least 8 stores, at least 12 products and at least 300 offer rows.
 * Eight stores times twelve products is 96, so the catalogue is the dimension
 * that grows — 44 products over 8 stores gives 352 candidate rows.
 *
 * Products are declared brand by brand rather than generated from noise: the
 * comparator is judged on density and legibility, and a made-up name of made-up
 * length would flatter the layout.
 */
type ProductSeed = {
  brand: string;
  name: string;
  category: ProductCategory;
  variants: { variant: string; netWeightGrams: number }[];
};

const PRODUCT_SEEDS: ProductSeed[] = [
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

/** Deterministic EAN-13 body — the fixtures need a stable id, not a valid one. */
function fakeEan(index: number): string {
  return `789${String(1_000_000 + index * 7919).padStart(10, '0')}`.slice(0, 13);
}

export const PRODUCTS: readonly Product[] = PRODUCT_SEEDS.flatMap((seed, seedIndex) =>
  seed.variants.map((variant, variantIndex): Product => {
    const index = seedIndex * 10 + variantIndex;
    return {
      id: `prd-${String(index).padStart(4, '0')}`,
      ean: fakeEan(index),
      name: seed.name,
      brand: seed.brand,
      category: seed.category,
      variant: variant.variant,
      netWeightGrams: variant.netWeightGrams,
    };
  }),
);

export const NEIGHBORHOODS: readonly string[] = [
  ...new Set(STORES.flatMap((store) => store.deliveryAreas.flatMap((area) => area.neighborhoods))),
].sort((a, b) => a.localeCompare(b, 'pt-BR'));
