import "dotenv/config";
import { PrismaClient, UserRole, StoreStatus, DeliveryProviderType, DiscountType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const FIXED_CITY = "Rio de Janeiro";
const FIXED_STATE = "RJ";

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  categorySlug: string;
  petTypeSlug: string;
  images: string[];
  brand?: string;
  promotion?: {
    name: string;
    discountType: DiscountType;
    value: number;
  };
}

interface SeedCoupon {
  code: string;
  name: string;
  discountType: DiscountType;
  value: number;
}

interface SeedStore {
  ownerEmail: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  street: string;
  number: string;
  neighborhood: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp: string;
  instagram: string;
  deliveryProvider: DeliveryProviderType;
  deliveryTimeMinutes: number;
  businessHours: {
    weekdays: { open: string; close: string } | null;
    saturday: { open: string; close: string } | null;
    sunday: { open: string; close: string } | null;
  };
  products: SeedProduct[];
  coupons: SeedCoupon[];
}

async function main() {
  console.log('Iniciando o seeding do banco de dados...');

  // 1. Admin
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@petdots.local';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'AdminP@ssw0rd123';
  const adminName = process.env.ADMIN_SEED_NAME ?? 'PetDots Admin';
  const adminPasswordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, isActive: true },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`Usuário admin pronto: ${admin.email}`);

  // 2. Categorias Globais
  const categoriesData = [
    { name: 'Rações', slug: 'racoes' },
    { name: 'Brinquedos', slug: 'brinquedos' },
    { name: 'Higiene & Beleza', slug: 'higiene-beleza' },
    { name: 'Acessórios', slug: 'acessorios' },
    { name: 'Saúde & Medicamentos', slug: 'saude-medicamentos' },
    { name: 'Camas & Casinhas', slug: 'camas-casinhas' },
    { name: 'Aquarismo', slug: 'aquarismo' },
    { name: 'Aves & Gaiolas', slug: 'aves-gaiolas' },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const dbCat = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, slug: cat.slug },
    });
    categoriesMap[cat.slug] = dbCat.id;
  }
  console.log('Categorias criadas/atualizadas.');

  // 3. Tipos de Pets
  const petTypesData = [
    { name: 'Cão', slug: 'cao' },
    { name: 'Gato', slug: 'gato' },
    { name: 'Pássaro', slug: 'passaro' },
    { name: 'Peixe', slug: 'peixe' },
    { name: 'Roedores', slug: 'roedores' },
  ];

  const petTypesMap: Record<string, string> = {};
  for (const pt of petTypesData) {
    const dbPt = await prisma.petType.upsert({
      where: { name: pt.name },
      update: {},
      create: { name: pt.name, slug: pt.slug },
    });
    petTypesMap[pt.slug] = dbPt.id;
  }
  console.log('Tipos de pets criados/atualizadas.');

  // 4. Lojistas (Users)
  const defaultOwnerPassword = 'StoreOwner123!';
  const ownerPasswordHash = await argon2.hash(defaultOwnerPassword);

  const ownersData = [
    { email: 'copacabana_owner@petdots.local', name: 'Carlos Silva' },
    { email: 'gatomia_owner@petdots.local', name: 'Juliana Costa' },
    { email: 'caodeguarda_owner@petdots.local', name: 'Roberto Souza' },
    { email: 'aquarius_owner@petdots.local', name: 'Marcos Santos' },
    { email: 'mundopet_owner@petdots.local', name: 'Luciana Oliveira' },
  ];

  const ownersMap: Record<string, string> = {};
  for (const owner of ownersData) {
    const dbOwner = await prisma.user.upsert({
      where: { email: owner.email },
      update: { role: UserRole.STORE_OWNER, isActive: true },
      create: {
        email: owner.email,
        name: owner.name,
        passwordHash: ownerPasswordHash,
        role: UserRole.STORE_OWNER,
        emailVerified: true,
      },
    });
    ownersMap[owner.email] = dbOwner.id;
  }
  console.log('Lojistas criados/atualizados.');

  // 5. Lojas e Produtos
  const storesData: SeedStore[] = [
    {
      ownerEmail: 'copacabana_owner@petdots.local',
      name: 'Petshop Copacabana Mar',
      slug: 'petshop-copacabana-mar',
      description: 'O melhor petshop da Zona Sul, com banho e tosa de excelência e rações premium.',
      logoUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=200&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=1200&auto=format&fit=crop',
      street: 'Rua Barata Ribeiro',
      number: '370',
      neighborhood: 'Copacabana',
      zipCode: '22040-002',
      latitude: -22.969176,
      longitude: -43.187425,
      phone: '(21) 98888-7777',
      whatsapp: '(21) 98888-7777',
      instagram: 'petshop_copacabana_mar',
      deliveryProvider: DeliveryProviderType.SELF,
      deliveryTimeMinutes: 35,
      businessHours: {
        weekdays: { open: '08:00', close: '19:00' },
        saturday: { open: '08:00', close: '14:00' },
        sunday: null,
      },
      products: [
        {
          name: 'Ração Royal Canin Golden Retriever Adulto 12kg',
          description: 'Alimento completo seco para cães adultos e maduros da raça Golden Retriever - A partir de 15 meses de idade.',
          price: 319.90,
          stock: 15,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Royal Canin',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1608454367599-c1139e24db4b?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Oferta Especial Golden',
            discountType: DiscountType.PERCENTAGE,
            value: 15.00,
          }
        },
        {
          name: 'Brinquedo Mordedor de Corda com Nó',
          description: 'Ideal para cães de médio e grande porte, promove a saúde bucal brincando.',
          price: 29.90,
          stock: 50,
          categorySlug: 'brinquedos',
          petTypeSlug: 'cao',
          brand: 'Amigo Fiel',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Shampoo Neutro Pet Clean 500ml',
          description: 'Fórmula suave para cães e gatos de todas as idades, com pH balanceado.',
          price: 19.90,
          stock: 3,
          categorySlug: 'higiene-beleza',
          petTypeSlug: 'cao',
          brand: 'Pet Clean',
          images: [
            'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Comedouro Duplo Inox com Suporte',
          description: 'Comedouro resistente e higiênico para cães com suporte elevado.',
          price: 69.90,
          stock: 12,
          categorySlug: 'acessorios',
          petTypeSlug: 'cao',
          brand: 'Pet Clean',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Desconto Comedouro',
            discountType: DiscountType.PERCENTAGE,
            value: 10.00,
          }
        },
        {
          name: 'Petisco Doguitos Carne 65g',
          description: 'Delicioso petisco mastigável sabor carne para cães de todas as idades.',
          price: 8.90,
          stock: 120,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Purina',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Coleira Antipulgas Seresto para Cães até 8kg',
          description: 'Proteção contínua contra pulgas e carrapatos por até 8 meses.',
          price: 189.90,
          stock: 25,
          categorySlug: 'saude-medicamentos',
          petTypeSlug: 'cao',
          brand: 'Elanco',
          images: [
            'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Promoção Seresto',
            discountType: DiscountType.FIXED_AMOUNT,
            value: 20.00,
          }
        },
        {
          name: 'Ração Seca Royal Canin Shih Tzu Adulto 1.5kg',
          description: 'Alimento completo seco para cães adultos da raça Shih Tzu - A partir de 10 meses.',
          price: 89.90,
          stock: 18,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Royal Canin',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Snack Kelco Keldog Bifinho Carne e Cereais 55g',
          description: 'Bifinho saboroso para adestramento e agrado do seu cão.',
          price: 5.50,
          stock: 80,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Keldog',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
          ]
        }
      ],
      coupons: [
        { code: 'COPA10', name: 'Boas-vindas Copacabana', discountType: DiscountType.PERCENTAGE, value: 10.00 }
      ]
    },
    {
      ownerEmail: 'gatomia_owner@petdots.local',
      name: 'Gato Mia Pet Store',
      slug: 'gato-mia-pet-store',
      description: 'Especialistas em felinos! Tudo para o conforto, saúde e diversão do seu gatinho.',
      logoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=1200&auto=format&fit=crop',
      street: 'Rua Voluntários da Pátria',
      number: '250',
      neighborhood: 'Botafogo',
      zipCode: '22270-014',
      latitude: -22.953846,
      longitude: -43.191631,
      phone: '(21) 97777-6666',
      whatsapp: '(21) 97777-6666',
      instagram: 'gato_mia_pet',
      deliveryProvider: DeliveryProviderType.SELF,
      deliveryTimeMinutes: 25,
      businessHours: {
        weekdays: { open: '09:00', close: '18:30' },
        saturday: { open: '09:00', close: '13:00' },
        sunday: null,
      },
      products: [
        {
          name: 'Arranhador Torre Castelo para Gatos',
          description: 'Três andares de diversão e descanso para seu gato. Tecido de pelúcia super macio e sisal premium.',
          price: 189.90,
          stock: 5,
          categorySlug: 'camas-casinhas',
          petTypeSlug: 'gato',
          brand: 'Gato Mia',
          images: [
            'https://images.unsplash.com/photo-1545249390-6bdfa286032f?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Desconto de Inauguração Felina',
            discountType: DiscountType.PERCENTAGE,
            value: 10.00,
          }
        },
        {
          name: 'Ração Seca PremieR Gatos Castrados 7.5kg',
          description: 'Alimento completo para gatos adultos castrados de 1 a 6 anos, controle de peso ideal.',
          price: 159.90,
          stock: 20,
          categorySlug: 'racoes',
          petTypeSlug: 'gato',
          brand: 'PremieR',
          images: [
            'https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1608454367599-c1139e24db4b?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Brinquedo Varinha com Penas e Guizo',
          description: 'Desperte o instinto de caçador do seu felino com esta varinha super flexível.',
          price: 14.90,
          stock: 100,
          categorySlug: 'brinquedos',
          petTypeSlug: 'gato',
          brand: 'Gato Mia',
          images: [
            'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Ração Umida Royal Canin Sachê Gatos Castrados 85g',
          description: 'Alimento úmido completo em molho saboroso para gatos castrados.',
          price: 5.90,
          stock: 150,
          categorySlug: 'racoes',
          petTypeSlug: 'gato',
          brand: 'Royal Canin',
          images: [
            'https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Cama Almofada Redonda para Gatos',
          description: 'Cama macia redonda estilo nuvem para o descanso do seu felino.',
          price: 79.90,
          stock: 8,
          categorySlug: 'camas-casinhas',
          petTypeSlug: 'gato',
          brand: 'Gato Mia',
          images: [
            'https://images.unsplash.com/photo-1545249390-6bdfa286032f?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Petisco Whiskas Temptations Pelo Saudável 40g',
          description: 'Petiscos crocantes com recheio cremoso que auxiliam na saúde do pelo.',
          price: 7.20,
          stock: 90,
          categorySlug: 'racoes',
          petTypeSlug: 'gato',
          brand: 'Whiskas',
          images: [
            'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Brinquedo Bola de Sisal com Pena',
          description: 'Bola revestida de sisal com penas para gatos arranharem e perseguirem.',
          price: 9.90,
          stock: 65,
          categorySlug: 'brinquedos',
          petTypeSlug: 'gato',
          brand: 'Gato Mia',
          images: [
            'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Comedouro Ergonômico de Cerâmica para Gatos',
          description: 'Comedouro elevado de cerâmica que evita fadiga dos bigodes.',
          price: 49.90,
          stock: 14,
          categorySlug: 'acessorios',
          petTypeSlug: 'gato',
          brand: 'Gato Mia',
          images: [
            'https://images.unsplash.com/photo-1545249390-6bdfa286032f?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Areia Higiênica Pipicat Sílica Gel 1.8kg',
          description: 'Cristais de sílica gel com alta absorção de odores e líquidos.',
          price: 45.00,
          stock: 35,
          categorySlug: 'higiene-beleza',
          petTypeSlug: 'gato',
          brand: 'Pipicat',
          images: [
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Oferta Areia Pipicat',
            discountType: DiscountType.PERCENTAGE,
            value: 15.00,
          }
        }
      ],
      coupons: [
        { code: 'MIA5', name: 'Desconto Mia', discountType: DiscountType.FIXED_AMOUNT, value: 5.00 }
      ]
    },
    {
      ownerEmail: 'caodeguarda_owner@petdots.local',
      name: 'Cão de Guarda Petshop',
      slug: 'cao-de-guarda-petshop',
      description: 'Segurança e saúde para o seu pet. Rações para raças grandes, acessórios robustos e farmácia completa.',
      logoUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=200&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=1200&auto=format&fit=crop',
      street: 'Avenida Olegário Maciel',
      number: '400',
      neighborhood: 'Barra da Tijuca',
      zipCode: '22621-200',
      latitude: -23.013589,
      longitude: -43.306024,
      phone: '(21) 96666-5555',
      whatsapp: '(21) 96666-5555',
      instagram: 'caodeguarda_pet',
      deliveryProvider: DeliveryProviderType.SELF,
      deliveryTimeMinutes: 50,
      businessHours: {
        weekdays: { open: '08:00', close: '20:00' },
        saturday: { open: '08:00', close: '18:00' },
        sunday: null,
      },
      products: [
        {
          name: 'Guia Retrátil Amigo Fiel 5 metros',
          description: 'Fita de nylon super resistente para cães de até 25kg, freio seguro e ergonômico.',
          price: 49.90,
          stock: 30,
          categorySlug: 'acessorios',
          petTypeSlug: 'cao',
          brand: 'Amigo Fiel',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Caminha Pet Impermeável tamanho G',
          description: 'Espuma densa de alta qualidade e zíper para lavagem. Perfeita para cães médios e grandes.',
          price: 120.00,
          stock: 0,
          categorySlug: 'camas-casinhas',
          petTypeSlug: 'cao',
          brand: 'Cão de Guarda',
          images: [
            'https://images.unsplash.com/photo-1591946614720-90a587da4a36?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Ração Seca Dog Chow Cães Adultos 15kg',
          description: 'Nutrição 100% completa para o bem-estar do seu cão de guarda.',
          price: 145.00,
          stock: 12,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Dog Chow',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Desconto Dog Chow',
            discountType: DiscountType.FIXED_AMOUNT,
            value: 15.00,
          }
        },
        {
          name: 'Peitoral H para Cães Ajustável',
          description: 'Peitoral estilo H em poliéster reforçado, regulagem ampla e fecho de segurança.',
          price: 59.90,
          stock: 18,
          categorySlug: 'acessorios',
          petTypeSlug: 'cao',
          brand: 'Amigo Fiel',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Brinquedo Kong Classic tamanho G',
          description: 'O padrão de ouro dos brinquedos de borracha natural durável e recheável.',
          price: 99.90,
          stock: 15,
          categorySlug: 'brinquedos',
          petTypeSlug: 'cao',
          brand: 'Kong',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Promoção Kong',
            discountType: DiscountType.PERCENTAGE,
            value: 12.00,
          }
        },
        {
          name: 'Ração Seca PremieR Formula Cães Adultos Raças Grandes 15kg',
          description: 'Alimento super premium completo para cães de grande porte, saúde das articulações.',
          price: 249.90,
          stock: 8,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'PremieR',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Educador Sanitário Pipi Pode Sim 20ml',
          description: 'Gotas atrativas que auxiliam no adestramento do local correto para o cão urinar.',
          price: 15.90,
          stock: 45,
          categorySlug: 'higiene-beleza',
          petTypeSlug: 'cao',
          brand: 'Cão de Guarda',
          images: [
            'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Suplemento Vitamínico Glicopan Pet 125ml',
          description: 'Estimulante do apetite e melhora do estado geral em cães e gatos.',
          price: 32.90,
          stock: 22,
          categorySlug: 'saude-medicamentos',
          petTypeSlug: 'cao',
          brand: 'Vetnil',
          images: [
            'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500&auto=format&fit=crop',
          ]
        }
      ],
      coupons: []
    },
    {
      ownerEmail: 'aquarius_owner@petdots.local',
      name: 'Aquarius Fish & Birds',
      slug: 'aquarius-fish-birds',
      description: 'Especializado em aquarismo de água doce e salgada, peixes ornamentais e pássaros exóticos.',
      logoUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=200&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop',
      street: 'Rua Conde de Bonfim',
      number: '300',
      neighborhood: 'Tijuca',
      zipCode: '20520-054',
      latitude: -22.923838,
      longitude: -43.224163,
      phone: '(21) 95555-4444',
      whatsapp: '(21) 95555-4444',
      instagram: 'aquarius_peixes_aves',
      deliveryProvider: DeliveryProviderType.SELF,
      deliveryTimeMinutes: 45,
      businessHours: {
        weekdays: { open: '09:00', close: '19:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: null,
      },
      products: [
        {
          name: 'Aquário Completo de Vidro 30 Litros',
          description: 'Acompanha filtro interno silencioso, iluminação LED integrada e termostato.',
          price: 380.00,
          stock: 4,
          categorySlug: 'aquarismo',
          petTypeSlug: 'peixe',
          brand: 'Aquarius',
          images: [
            'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Ração TetraMin Tropical Flakes 52g',
          description: 'Alimento em flocos completo para todos os peixes ornamentais tropicais, não turva a água.',
          price: 42.90,
          stock: 40,
          categorySlug: 'aquarismo',
          petTypeSlug: 'peixe',
          brand: 'Tetra',
          images: [
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Gaiola Luxo para Canários e Calopsitas',
          description: 'Pintura epóxi branca, poleiros em madeira natural e comedouros transparentes de fácil recarga.',
          price: 139.00,
          stock: 6,
          categorySlug: 'aves-gaiolas',
          petTypeSlug: 'passaro',
          brand: 'Aquarius',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Termostato para Aquário Hopar 100W',
          description: 'Termostato de aquecimento automático com precisão de ajuste de temperatura.',
          price: 79.90,
          stock: 12,
          categorySlug: 'aquarismo',
          petTypeSlug: 'peixe',
          brand: 'Hopar',
          images: [
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Oferta Aquecimento',
            discountType: DiscountType.PERCENTAGE,
            value: 10.00,
          }
        },
        {
          name: 'Substrato de Areia de Quartzo 5kg',
          description: 'Substrato fino ideal para plantados e peixes de fundo.',
          price: 35.00,
          stock: 18,
          categorySlug: 'aquarismo',
          petTypeSlug: 'peixe',
          brand: 'Aquarius',
          images: [
            'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Ração Alcon Club Calopsita 350g',
          description: 'Alimento completo extrusado e balanceado para calopsitas e outros psitacídeos.',
          price: 24.90,
          stock: 50,
          categorySlug: 'aves-gaiolas',
          petTypeSlug: 'passaro',
          brand: 'Alcon',
          images: [
            'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Bebedouro Malha Fina para Pássaros 100ml',
          description: 'Bebedouro prático com fixação em gaiolas de malha fina.',
          price: 4.80,
          stock: 75,
          categorySlug: 'aves-gaiolas',
          petTypeSlug: 'passaro',
          brand: 'Aquarius',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Poleiro Natural Galho Seco',
          description: 'Galho de madeira natural tratada para o bem-estar e exercício das patas do pássaro.',
          price: 12.00,
          stock: 30,
          categorySlug: 'aves-gaiolas',
          petTypeSlug: 'passaro',
          brand: 'Aquarius',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop',
          ]
        }
      ],
      coupons: []
    },
    {
      ownerEmail: 'mundopet_owner@petdots.local',
      name: 'Mundo Pet Tijuca',
      slug: 'mundo-pet-tijuca',
      description: 'Seu pet center completo na Tijuca. Rações, brinquedos e entrega rápida em toda a grande Tijuca.',
      logoUrl: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?q=80&w=200&auto=format&fit=crop',
      coverUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=1200&auto=format&fit=crop',
      street: 'Rua São Francisco Xavier',
      number: '180',
      neighborhood: 'Tijuca',
      zipCode: '20550-012',
      latitude: -22.916942,
      longitude: -43.218523,
      phone: '(21) 94444-3333',
      whatsapp: '(21) 94444-3333',
      instagram: 'mundo_pet_tijuca',
      deliveryProvider: DeliveryProviderType.SELF,
      deliveryTimeMinutes: 20,
      businessHours: {
        weekdays: { open: '08:00', close: '22:00' },
        saturday: { open: '08:00', close: '22:00' },
        sunday: { open: '09:00', close: '18:00' }
      },
      products: [
        {
          name: 'Ração Seca Golden Special Cães Adultos 15kg',
          description: 'Ração Premium de alta qualidade para cães adultos de todas as raças.',
          price: 139.90,
          stock: 25,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Golden Special',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Brinquedo Arranhador Ratinho Sisal',
          description: 'Brinquedo divertido que ajuda a gastar as unhas dos gatos de forma saudável.',
          price: 18.50,
          stock: 150,
          categorySlug: 'brinquedos',
          petTypeSlug: 'gato',
          brand: 'Mundo Pet',
          images: [
            'https://images.unsplash.com/photo-1545249390-6bdfa286032f?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Antipulgas Frontline Tri-Act Cães de 10 a 20kg',
          description: '3 pipetas de ação rápida e duradoura contra pulgas, carrapatos e mosquitos.',
          price: 99.00,
          stock: 18,
          categorySlug: 'saude-medicamentos',
          petTypeSlug: 'cao',
          brand: 'Frontline',
          images: [
            'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Ração Umida Pedigree Sachê Carne ao Molho 100g',
          description: 'Alimento úmido saboroso completo para cães adultos.',
          price: 3.50,
          stock: 200,
          categorySlug: 'racoes',
          petTypeSlug: 'cao',
          brand: 'Pedigree',
          images: [
            'https://images.unsplash.com/photo-1589723900909-5e3902746a16?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Tapete Higiênico SuperSeco 30 unidades',
          description: 'Tapetes higiênicos com carvão ativado e rápida absorção de odores e urina.',
          price: 64.90,
          stock: 40,
          categorySlug: 'higiene-beleza',
          petTypeSlug: 'cao',
          brand: 'SuperSeco',
          images: [
            'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Bolinha de Tênis Mordedora para Cães',
          description: 'Bolinha de borracha texturizada super elástica para jogos de buscar.',
          price: 12.00,
          stock: 80,
          categorySlug: 'brinquedos',
          petTypeSlug: 'cao',
          brand: 'Mundo Pet',
          images: [
            'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Desconto Bolinha',
            discountType: DiscountType.FIXED_AMOUNT,
            value: 3.00,
          }
        },
        {
          name: 'Ração Seca Whiskas Gatos Adultos Sabor Carne 10.1kg',
          description: 'Ração completa seca com nuggets recheados para gatos adultos.',
          price: 129.90,
          stock: 15,
          categorySlug: 'racoes',
          petTypeSlug: 'gato',
          brand: 'Whiskas',
          images: [
            'https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?q=80&w=500&auto=format&fit=crop',
          ]
        },
        {
          name: 'Vermífugo Drontal Plus para Cães até 10kg',
          description: 'Vermífugo de amplo espectro para combate a vermes redondos e chatos.',
          price: 49.90,
          stock: 30,
          categorySlug: 'saude-medicamentos',
          petTypeSlug: 'cao',
          brand: 'Bayer',
          images: [
            'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=500&auto=format&fit=crop',
          ],
          promotion: {
            name: 'Drontal Especial',
            discountType: DiscountType.PERCENTAGE,
            value: 20.00,
          }
        }
      ],
      coupons: [
        { code: 'TIJUCA20', name: 'Inauguração Tijuca', discountType: DiscountType.PERCENTAGE, value: 20.00 }
      ]
    }
  ];

  for (const storeData of storesData) {
    const ownerId = ownersMap[storeData.ownerEmail];
    if (!ownerId) {
      console.warn(`Lojista com e-mail ${storeData.ownerEmail} não encontrado, pulando cadastro de loja...`);
      continue;
    }

    // 5.1 Criar/atualizar a Loja
    const store = await prisma.store.upsert({
      where: { slug: storeData.slug },
      update: {
        status: StoreStatus.ACTIVE,
        ownerId,
        description: storeData.description,
        logoUrl: storeData.logoUrl,
        coverUrl: storeData.coverUrl,
        street: storeData.street,
        number: storeData.number,
        neighborhood: storeData.neighborhood,
        city: FIXED_CITY,
        state: FIXED_STATE,
        zipCode: storeData.zipCode,
        latitude: storeData.latitude,
        longitude: storeData.longitude,
        phone: storeData.phone,
        whatsapp: storeData.whatsapp,
        instagram: storeData.instagram,
        deliveryProvider: storeData.deliveryProvider,
        deliveryTimeMinutes: storeData.deliveryTimeMinutes,
        businessHours: storeData.businessHours as any,
      },
      create: {
        ownerId,
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description,
        logoUrl: storeData.logoUrl,
        coverUrl: storeData.coverUrl,
        street: storeData.street,
        number: storeData.number,
        neighborhood: storeData.neighborhood,
        city: FIXED_CITY,
        state: FIXED_STATE,
        zipCode: storeData.zipCode,
        latitude: storeData.latitude,
        longitude: storeData.longitude,
        phone: storeData.phone,
        whatsapp: storeData.whatsapp,
        instagram: storeData.instagram,
        deliveryProvider: storeData.deliveryProvider,
        deliveryTimeMinutes: storeData.deliveryTimeMinutes,
        status: StoreStatus.ACTIVE,
        businessHours: storeData.businessHours as any,
      },
    });

    console.log(`Loja pronta: ${store.name} (id: ${store.id})`);

    // 5.2 Criar/atualizar os produtos da loja
    for (const productData of storeData.products) {
      const categoryId = categoriesMap[productData.categorySlug] || null;
      const petTypeId = petTypesMap[productData.petTypeSlug] || null;

      // Upsert da marca se existir
      let brandId: string | null = null;
      if (productData.brand) {
        const brand = await prisma.brand.upsert({
          where: { name: productData.brand },
          update: {},
          create: { name: productData.brand },
        });
        brandId = brand.id;
      }

      // Catálogo global: busca por nome (produto pode já existir criado por outra loja)
      let catalogProduct = await prisma.catalogProduct.findFirst({
        where: { name: productData.name },
      });

      if (catalogProduct) {
        catalogProduct = await prisma.catalogProduct.update({
          where: { id: catalogProduct.id },
          data: {
            description: productData.description,
            categoryId,
            petTypeId,
            brandId,
            status: 'ACTIVE', // Aprovado por padrão no seed
          },
        });
        await prisma.catalogProductImage.deleteMany({ where: { catalogProductId: catalogProduct.id } });
        await prisma.catalogProductImage.createMany({
          data: productData.images.map((url, index) => ({
            catalogProductId: catalogProduct!.id,
            url,
            position: index,
          })),
        });
      } else {
        catalogProduct = await prisma.catalogProduct.create({
          data: {
            createdByStoreId: store.id,
            categoryId,
            petTypeId,
            brandId,
            name: productData.name,
            description: productData.description,
            status: 'ACTIVE', // Aprovado por padrão no seed
            images: {
              create: productData.images.map((url, index) => ({ url, position: index })),
            },
          },
        });
      }

      // Oferta da loja: busca ou cria StoreProduct para essa loja + produto do catálogo
      let storeProduct = await prisma.storeProduct.findUnique({
        where: {
          storeId_catalogProductId: {
            storeId: store.id,
            catalogProductId: catalogProduct.id,
          },
        },
      });

      if (storeProduct) {
        storeProduct = await prisma.storeProduct.update({
          where: { id: storeProduct.id },
          data: { price: productData.price, stock: productData.stock, isActive: true },
        });
      } else {
        storeProduct = await prisma.storeProduct.create({
          data: {
            storeId: store.id,
            catalogProductId: catalogProduct.id,
            price: productData.price,
            stock: productData.stock,
            isActive: true,
          },
        });
      }

      // 5.3 Promoções de produtos
      if (productData.promotion) {
        const startsAt = new Date();
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 30);

        // Delete any old promotion with code (coupon style) for this store product
        await prisma.promotion.deleteMany({
          where: {
            storeProductId: storeProduct.id,
            code: { not: null },
          },
        });

        // Find or create direct promotion (code: null)
        const existingPromo = await prisma.promotion.findFirst({
          where: {
            storeId: store.id,
            storeProductId: storeProduct.id,
            code: null,
          },
        });

        if (existingPromo) {
          await prisma.promotion.update({
            where: { id: existingPromo.id },
            data: {
              discountType: productData.promotion.discountType,
              value: productData.promotion.value,
              startsAt,
              endsAt,
              isActive: true,
            },
          });
        } else {
          await prisma.promotion.create({
            data: {
              storeId: store.id,
              storeProductId: storeProduct.id,
              name: productData.promotion.name,
              code: null,
              discountType: productData.promotion.discountType,
              value: productData.promotion.value,
              startsAt,
              endsAt,
              isActive: true,
            },
          });
        }
      }
    }

    // 5.4 Cupons de loja
    for (const coupon of storeData.coupons) {
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 90);

      await prisma.promotion.upsert({
        where: {
          storeId_code: {
            storeId: store.id,
            code: coupon.code,
          }
        },
        update: {
          discountType: coupon.discountType,
          value: coupon.value,
          startsAt,
          endsAt,
          isActive: true,
        },
        create: {
          storeId: store.id,
          name: coupon.name,
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          startsAt,
          endsAt,
          isActive: true,
        }
      });
    }
  }

  console.log('Seeding concluído com sucesso!');
}

main()
  .catch((error) => {
    console.error('Erro durante o seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
