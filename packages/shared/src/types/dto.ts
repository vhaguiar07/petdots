import { AuthUser, BusinessHours } from './entities';
import {
  DeliveryProviderType,
  DiscountType,
  OrderStatus,
  StoreStatus,
  UserRole,
} from './enums';

export interface RegisterInput {
  email: string;
  password: string;
  passwordConfirmation: string;
  name: string;
  phone?: string;
  /** Apenas CUSTOMER ou STORE_OWNER; ADMIN não pode ser criado via registro público. */
  role?: Extract<UserRole, 'CUSTOMER' | 'STORE_OWNER'>;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface CreateStoreInput {
  name: string;
  description?: string;
  deliveryProvider?: DeliveryProviderType;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  logoUrl?: string;
  coverUrl?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  businessHours?: BusinessHours;
  deliveryTimeMinutes?: number;
  deliveryRadiusKm?: number;
}

export type UpdateStoreInput = Partial<CreateStoreInput>;

export interface ListStoresQuery {
  lat?: number;
  lng?: number;
  sort?: 'rating' | 'newest';
  limit?: number;
  deliveryProvider?: DeliveryProviderType;
  fastDelivery?: boolean;
}

export interface CreateCategoryInput {
  name: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CreatePetTypeInput {
  name: string;
}

export type UpdatePetTypeInput = Partial<CreatePetTypeInput>;

export interface CreateBrandInput {
  name: string;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;

export interface CreateStoreProductInput {
  storeId: string;
  /** Se informado, reutiliza produto do catálogo global; campos de catálogo são ignorados. */
  catalogProductId?: string;
  /** Obrigatório quando catalogProductId não é informado. */
  name?: string;
  brandId?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  petTypeId?: string;
  images?: string[];
  price: number;
  stock: number;
  customDescription?: string;
}

export type UpdateStoreProductInput = {
  name?: string;
  brand?: string;
  description?: string;
  categoryId?: string;
  petTypeId?: string;
  images?: string[];
  price?: number;
  stock?: number;
  customDescription?: string;
  isActive?: boolean;
};

export interface QueryStoreProductsInput {
  storeId?: string;
  categoryId?: string;
  petTypeId?: string;
  search?: string;
  onSale?: boolean;
  page?: number;
  pageSize?: number;
}

/** @deprecated use CreateStoreProductInput */
export type CreateProductInput = CreateStoreProductInput;
/** @deprecated use UpdateStoreProductInput */
export type UpdateProductInput = UpdateStoreProductInput;
/** @deprecated use QueryStoreProductsInput */
export type QueryProductsInput = QueryStoreProductsInput;

export interface CreatePromotionInput {
  storeId: string;
  storeProductId?: string;
  name: string;
  discountType: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  code?: string;
  highlighted?: boolean;
  highlightMessage?: string;
}

export type UpdatePromotionInput = Partial<Omit<CreatePromotionInput, 'storeId'>> & {
  isActive?: boolean;
};

export interface CreateAddressInput {
  label?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export type UpdateAddressInput = Partial<CreateAddressInput>;

export interface OrderItemInput {
  storeProductId: string;
  quantity: number;
}

export interface CreateOrderInput {
  storeId: string;
  addressId: string;
  items: OrderItemInput[];
  couponCode?: string;
}

export interface QueryOrdersInput {
  storeId?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

export interface QueryStoresInput {
  status?: StoreStatus;
  page?: number;
  pageSize?: number;
}

export interface UpdateStoreStatusInput {
  status: StoreStatus;
}

export interface QueryUsersInput {
  role?: UserRole;
  page?: number;
  pageSize?: number;
}

export interface UpdateUserInput {
  role?: UserRole;
  isActive?: boolean;
}

export interface QueryAuditLogsInput {
  entity?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface QueryCatalogInput {
  status?: 'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED';
  page?: number;
  pageSize?: number;
}

export interface UpdateCatalogProductStatusInput {
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED';
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export interface ReplyReviewInput {
  reply: string;
}

export interface UpsertPriceAlertInput {
  catalogProductId: string;
  targetPrice: number;
}
