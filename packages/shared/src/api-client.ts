import {
  AuthResponse,
  ChangePasswordInput,
  CreateAddressInput,
  CreateCategoryInput,
  CreateOrderInput,
  CreatePromotionInput,
  CreateProductInput,
  CreateReviewInput,
  CreateStoreInput,
  ListStoresQuery,
  LoginInput,
  QueryAuditLogsInput,
  QueryOrdersInput,
  QueryProductsInput,
  QueryStoresInput,
  QueryUsersInput,
  RegisterInput,
  ReplyReviewInput,
  UpdateAddressInput,
  UpdateCategoryInput,
  UpdateOrderStatusInput,
  UpdatePromotionInput,
  UpdateProductInput,
  UpdateStoreInput,
  UpdateStoreStatusInput,
  UpdateUserInput,
} from './types/dto';
import {
  Address,
  AuditLog,
  Category,
  Order,
  PaginatedResult,
  Product,
  ProductReview,
  Promotion,
  Store,
  StoreReview,
  StoreStats,
  User,
} from './types/entities';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(typeof body === 'object' && body && 'message' in body ? String((body as { message: unknown }).message) : `Request failed with status ${status}`);
  }
}

export interface TokenStorage {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenStorage?: TokenStorage;
}

/**
 * Thin typed HTTP client shared between the web (Next.js) and mobile (Expo) apps.
 * Automatically attaches the access token and retries once with a refreshed
 * token on a 401 response, when a TokenStorage is provided.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokenStorage?: TokenStorage;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tokenStorage = options.tokenStorage;
  }

  // ---- Auth -----------------------------------------------------------

  register(input: RegisterInput) {
    return this.request<AuthResponse>('POST', '/auth/register', input, { auth: false }).then(
      (res) => this.persistTokens(res),
    );
  }

  login(input: LoginInput) {
    return this.request<AuthResponse>('POST', '/auth/login', input, { auth: false }).then((res) =>
      this.persistTokens(res),
    );
  }

  async logout() {
    const refreshToken = await this.tokenStorage?.getRefreshToken();
    if (refreshToken) {
      await this.request('POST', '/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
    }
    await this.tokenStorage?.clearTokens();
  }

  getMe() {
    return this.request<User>('GET', '/auth/me');
  }

  changePassword(input: ChangePasswordInput) {
    return this.request<void>('PATCH', '/auth/change-password', input);
  }

  // ---- Stores -----------------------------------------------------------

  createStore(input: CreateStoreInput) {
    return this.request<Store>('POST', '/stores', input);
  }

  listStores(query: ListStoresQuery = {}) {
    const params = new URLSearchParams();
    if (query.lat !== undefined) params.set('lat', String(query.lat));
    if (query.lng !== undefined) params.set('lng', String(query.lng));
    if (query.sort) params.set('sort', query.sort);
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.storeType) params.set('storeType', query.storeType);
    if (query.deliveryProvider) params.set('deliveryProvider', query.deliveryProvider);
    const qs = params.toString();
    return this.request<Store[]>('GET', `/stores${qs ? `?${qs}` : ''}`, undefined, { auth: false });
  }

  getStore(id: string) {
    return this.request<Store>('GET', `/stores/${id}`, undefined, { auth: false });
  }

  getMyStore() {
    return this.request<Store | null>('GET', '/stores/me');
  }

  updateStore(id: string, input: UpdateStoreInput) {
    return this.request<Store>('PATCH', `/stores/${id}`, input);
  }

  getStoreStats(id: string) {
    return this.request<StoreStats>('GET', `/stores/${id}/stats`);
  }

  // ---- Categories ---------------------------------------------------------

  listCategories() {
    return this.request<Category[]>('GET', '/categories', undefined, { auth: false });
  }

  createCategory(input: CreateCategoryInput) {
    return this.request<Category>('POST', '/categories', input);
  }

  updateCategory(id: string, input: UpdateCategoryInput) {
    return this.request<Category>('PATCH', `/categories/${id}`, input);
  }

  deleteCategory(id: string) {
    return this.request<void>('DELETE', `/categories/${id}`);
  }

  // ---- Products -----------------------------------------------------------

  listProducts(query: QueryProductsInput = {}) {
    const params = new URLSearchParams();
    if (query.storeId) params.set('storeId', query.storeId);
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.search) params.set('search', query.search);
    if (query.petType) params.set('petType', query.petType);
    if (query.onSale) params.set('onSale', 'true');
    const qs = params.toString();
    return this.request<Product[]>('GET', `/products${qs ? `?${qs}` : ''}`, undefined, {
      auth: false,
    });
  }

  getProduct(id: string) {
    return this.request<Product>('GET', `/products/${id}`, undefined, { auth: false });
  }

  listMyProducts(storeId: string) {
    return this.request<Product[]>('GET', `/products/mine?storeId=${storeId}`);
  }

  createProduct(input: CreateProductInput) {
    return this.request<Product>('POST', '/products', input);
  }

  updateProduct(id: string, input: UpdateProductInput) {
    return this.request<Product>('PATCH', `/products/${id}`, input);
  }

  deleteProduct(id: string) {
    return this.request<void>('DELETE', `/products/${id}`);
  }

  // ---- Promotions ---------------------------------------------------------

  listPromotionsForStore(storeId: string) {
    return this.request<Promotion[]>('GET', `/promotions?storeId=${storeId}`, undefined, {
      auth: false,
    });
  }

  listMyPromotions(storeId: string) {
    return this.request<Promotion[]>('GET', `/promotions/mine?storeId=${storeId}`);
  }

  getHighlightedCoupon(storeId: string) {
    return this.request<Promotion | null>('GET', `/promotions/highlighted?storeId=${storeId}`, undefined, {
      auth: false,
    });
  }

  validateCoupon(storeId: string, code: string) {
    return this.request<Promotion>(
      'GET',
      `/promotions/coupon?storeId=${storeId}&code=${encodeURIComponent(code)}`,
      undefined,
      { auth: false },
    );
  }

  createPromotion(input: CreatePromotionInput) {
    return this.request<Promotion>('POST', '/promotions', input);
  }

  updatePromotion(id: string, input: UpdatePromotionInput) {
    return this.request<Promotion>('PATCH', `/promotions/${id}`, input);
  }

  deletePromotion(id: string) {
    return this.request<void>('DELETE', `/promotions/${id}`);
  }

  // ---- Addresses -----------------------------------------------------------

  listAddresses() {
    return this.request<Address[]>('GET', '/addresses');
  }

  getAddress(id: string) {
    return this.request<Address>('GET', `/addresses/${id}`);
  }

  createAddress(input: CreateAddressInput) {
    return this.request<Address>('POST', '/addresses', input);
  }

  updateAddress(id: string, input: UpdateAddressInput) {
    return this.request<Address>('PATCH', `/addresses/${id}`, input);
  }

  deleteAddress(id: string) {
    return this.request<void>('DELETE', `/addresses/${id}`);
  }

  // ---- Orders -----------------------------------------------------------

  createOrder(input: CreateOrderInput) {
    return this.request<Order>('POST', '/orders', input);
  }

  listOrders(query: QueryOrdersInput = {}) {
    const params = new URLSearchParams();
    if (query.storeId) params.set('storeId', query.storeId);
    const qs = params.toString();
    return this.request<Order[]>('GET', `/orders${qs ? `?${qs}` : ''}`);
  }

  getOrder(id: string) {
    return this.request<Order>('GET', `/orders/${id}`);
  }

  updateOrderStatus(id: string, input: UpdateOrderStatusInput) {
    return this.request<Order>('PATCH', `/orders/${id}/status`, input);
  }

  cancelOrder(id: string) {
    return this.request<Order>('PATCH', `/orders/${id}/cancel`);
  }

  // ---- Admin -----------------------------------------------------------

  adminListStores(query: QueryStoresInput = {}) {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    const qs = params.toString();
    return this.request<Store[]>('GET', `/admin/stores${qs ? `?${qs}` : ''}`);
  }

  adminUpdateStoreStatus(id: string, input: UpdateStoreStatusInput) {
    return this.request<Store>('PATCH', `/admin/stores/${id}/status`, input);
  }

  adminListUsers(query: QueryUsersInput = {}) {
    const params = new URLSearchParams();
    if (query.role) params.set('role', query.role);
    const qs = params.toString();
    return this.request<User[]>('GET', `/admin/users${qs ? `?${qs}` : ''}`);
  }

  adminUpdateUser(id: string, input: UpdateUserInput) {
    return this.request<User>('PATCH', `/admin/users/${id}`, input);
  }

  adminListAuditLogs(query: QueryAuditLogsInput = {}) {
    const params = new URLSearchParams();
    if (query.entity) params.set('entity', query.entity);
    if (query.userId) params.set('userId', query.userId);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    return this.request<PaginatedResult<AuditLog>>('GET', `/admin/audit-logs${qs ? `?${qs}` : ''}`);
  }

  // ---- Reviews -----------------------------------------------------------

  listProductReviews(productId: string) {
    return this.request<ProductReview[]>('GET', `/products/${productId}/reviews`, undefined, {
      auth: false,
    });
  }

  upsertProductReview(productId: string, input: CreateReviewInput) {
    return this.request<ProductReview>('POST', `/products/${productId}/reviews`, input);
  }

  deleteProductReview(productId: string) {
    return this.request<void>('DELETE', `/products/${productId}/reviews`);
  }

  replyToProductReview(productId: string, reviewId: string, input: ReplyReviewInput) {
    return this.request<ProductReview>(
      'PATCH',
      `/products/${productId}/reviews/${reviewId}/reply`,
      input,
    );
  }

  listStoreReviews(storeId: string) {
    return this.request<StoreReview[]>('GET', `/stores/${storeId}/reviews`, undefined, {
      auth: false,
    });
  }

  upsertStoreReview(storeId: string, input: CreateReviewInput) {
    return this.request<StoreReview>('POST', `/stores/${storeId}/reviews`, input);
  }

  deleteStoreReview(storeId: string) {
    return this.request<void>('DELETE', `/stores/${storeId}/reviews`);
  }

  replyToStoreReview(storeId: string, reviewId: string, input: ReplyReviewInput) {
    return this.request<StoreReview>(
      'PATCH',
      `/stores/${storeId}/reviews/${reviewId}/reply`,
      input,
    );
  }

  // ---- Uploads -----------------------------------------------------------

  uploadProductImage(file: Blob, filename: string) {
    const formData = new FormData();
    formData.append('file', file, filename);
    return this.requestFormData<{ url: string }>('/uploads/images', formData);
  }

  // ---- Internals -----------------------------------------------------------

  private async persistTokens(response: AuthResponse) {
    await this.tokenStorage?.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: { auth?: boolean } = {},
  ): Promise<T> {
    const useAuth = options.auth !== false;
    const response = await this.fetch(method, path, body, useAuth);

    if (response.status === 401 && useAuth && this.tokenStorage) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retried = await this.fetch(method, path, body, useAuth);
        return this.parse<T>(retried);
      }
    }

    return this.parse<T>(response);
  }

  private async requestFormData<T>(path: string, formData: FormData): Promise<T> {
    const response = await this.fetchFormData(path, formData);

    if (response.status === 401 && this.tokenStorage) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retried = await this.fetchFormData(path, formData);
        return this.parse<T>(retried);
      }
    }

    return this.parse<T>(response);
  }

  private async fetchFormData(path: string, formData: FormData) {
    const headers: Record<string, string> = {};

    const token = await this.tokenStorage?.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  private async fetch(method: string, path: string, body: unknown, useAuth: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (useAuth) {
      const token = await this.tokenStorage?.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = await this.tokenStorage?.getRefreshToken();
    if (!refreshToken) return false;

    const response = await this.fetch('POST', '/auth/refresh', { refreshToken }, false);
    if (!response.ok) {
      await this.tokenStorage?.clearTokens();
      return false;
    }

    const data = (await response.json()) as AuthResponse;
    await this.persistTokens(data);
    return true;
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new ApiError(response.status, data);
    }

    return data as T;
  }
}
