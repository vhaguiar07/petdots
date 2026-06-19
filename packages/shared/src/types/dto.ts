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

export interface CreateProductInput {
  storeId: string;
  categoryId?: string;
  petTypeId?: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'storeId'>> & {
  isActive?: boolean;
};

export interface QueryProductsInput {
  storeId?: string;
  categoryId?: string;
  petTypeId?: string;
  search?: string;
  onSale?: boolean;
}

export interface CreatePromotionInput {
  storeId: string;
  productId?: string;
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
  productId: string;
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
}

export interface UpdateStoreStatusInput {
  status: StoreStatus;
}

export interface QueryUsersInput {
  role?: UserRole;
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

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export interface ReplyReviewInput {
  reply: string;
}
