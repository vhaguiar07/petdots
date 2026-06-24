import {
  CatalogProductStatus,
  DeliveryProviderType,
  DeliveryStatus,
  DiscountType,
  OrderStatus,
  StoreStatus,
  UserRole,
} from './enums';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface DaySchedule {
  open: string;
  close: string;
}

export interface BusinessHours {
  weekdays: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  deliveryProvider: DeliveryProviderType;
  deliveryTimeMinutes: number | null;
  deliveryRadiusKm: number;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  businessHours: BusinessHours | null;
  status: StoreStatus;
  avgRating: number;
  reviewCount: number;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Distância até as coordenadas informadas em `GET /stores?lat=&lng=`, em km. */
  distanceKm?: number;
  owner?: Pick<User, "id" | "name" | "email">;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "email"> | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface PetType {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProductImage {
  id: string;
  catalogProductId: string;
  url: string;
  position: number;
}

export interface CatalogProduct {
  id: string;
  createdByStoreId: string;
  categoryId: string | null;
  petTypeId: string | null;
  brandId: string | null;
  name: string;
  barcode: string | null;
  description: string | null;
  status: CatalogProductStatus;
  images: CatalogProductImage[];
  category?: Category | null;
  petType?: PetType | null;
  brand?: Brand | null;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  storeId: string;
  storeProductId: string | null;
  name: string;
  discountType: DiscountType;
  value: string;
  code: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  highlighted: boolean;
  highlightMessage: string | null;
  storeProduct?: { id: string; catalogProduct: { name: string } } | null;
}

export interface StoreProduct {
  id: string;
  storeId: string;
  catalogProductId: string;
  price: string;
  stock: number;
  customDescription: string | null;
  isActive: boolean;
  avgRating: number;
  reviewCount: number;
  catalogProduct: CatalogProduct;
  promotions?: Promotion[];
  store?: Store;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  storeProductId: string;
  quantity: number;
  unitPrice: string;
  storeProduct?: StoreProduct;
}

export interface Delivery {
  id: string;
  orderId: string;
  provider: DeliveryProviderType;
  externalId: string | null;
  status: DeliveryStatus;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  storeProductId: string;
  customerId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<User, "id" | "name">;
}

export interface StoreReview {
  id: string;
  storeId: string;
  customerId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<User, "id" | "name">;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  addressId: string;
  status: OrderStatus;
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  total: string;
  couponCode: string | null;
  items: OrderItem[];
  address?: Address;
  store?: Store;
  delivery?: Delivery | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreStatsRevenuePoint {
  date: string;
  revenue: number;
}

export interface StoreStatsTopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface StoreStats {
  revenueDelivered: number;
  revenueInProgress: number;
  ordersCount: number;
  cancelledOrdersCount: number;
  activeProductsCount: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByDay: StoreStatsRevenuePoint[];
  topProducts: StoreStatsTopProduct[];
}

export interface PriceHistory {
  id: string;
  storeProductId: string;
  price: string;
  recordedAt: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  catalogProductId: string;
  targetPrice: string;
  isActive: boolean;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  catalogProduct?: CatalogProduct;
}

export type Product = StoreProduct;
