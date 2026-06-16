import {
  DeliveryProviderType,
  DeliveryStatus,
  DiscountType,
  OrderStatus,
  PetType,
  StoreStatus,
  StoreType,
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
  storeType: StoreType | null;
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

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  position: number;
}

export interface Promotion {
  id: string;
  storeId: string;
  productId: string | null;
  name: string;
  discountType: DiscountType;
  value: string;
  code: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  highlighted: boolean;
  highlightMessage: string | null;
  product?: { id: string; name: string } | null;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  isActive: boolean;
  petType: PetType | null;
  avgRating: number;
  reviewCount: number;
  images: ProductImage[];
  promotions?: Promotion[];
  category?: Category | null;
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
  productId: string;
  quantity: number;
  unitPrice: string;
  product?: Product;
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
  productId: string;
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
