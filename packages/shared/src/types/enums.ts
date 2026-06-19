export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  STORE_OWNER: 'STORE_OWNER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StoreStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DeliveryProviderType = {
  SELF: 'SELF',
  EXTERNAL: 'EXTERNAL',
} as const;
export type DeliveryProviderType = (typeof DeliveryProviderType)[keyof typeof DeliveryProviderType];

export const DeliveryStatus = {
  WAITING: 'WAITING',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];


