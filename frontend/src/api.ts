// frontend/src/api.ts
import { Product, User, CartItem, Order, PromoCode, ApiResponse } from "./types";

const env = (import.meta as any).env;
const defaultApiUrl = env?.PROD ? '' : 'http://localhost:3002';
const rawApiUrl = (env?.VITE_API_URL !== undefined && env?.VITE_API_URL !== '' ? env.VITE_API_URL : defaultApiUrl).toString().trim();
const baseApiUrl = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : '';
export const API_BASE_URL = baseApiUrl ? (/\/api\/v1$/i.test(baseApiUrl) ? baseApiUrl : `${baseApiUrl}/api/v1`) : '/api/v1';
const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
};

// --------------------
// Helpers
// --------------------
function getXsrfToken(): string | null {
  const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

async function ensureXsrfCookie(): Promise<string | null> {
  let xsrf = getXsrfToken();
  if (!xsrf) {
    try {
      await fetch(`${API_BASE_URL}/health`, { credentials: "include" });
      xsrf = getXsrfToken();
      // Dev debug: log whether we obtained an XSRF cookie after calling health
      try {
        // Only print in dev to avoid leaking tokens in production
        if (!(import.meta as any).env?.PROD) console.debug('[API] ensureXsrfCookie -> XSRF from cookie:', xsrf);
      } catch (e) {
        console.debug('[API] ensureXsrfCookie dev logging failed', e);
      }
    } catch (e) {
      console.debug('[API] ensureXsrfCookie fetch failed', e);
    }
  }
  return xsrf;
}

// --------------------
// Core Request Handler
// --------------------
const handleRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  try {
    const headers: Record<string, any> = {
      ...options.headers,
    };

    // Only set Content-Type for JSON, not for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const method = (options.method || "GET").toUpperCase();

    // Attach CSRF token for unsafe requests
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const xsrf = (await ensureXsrfCookie()) || getXsrfToken();
      if (xsrf) headers["x-xsrf-token"] = xsrf;
    }

    // Dev debug: show outgoing request and XSRF token we're attaching
    try {
      if (!(import.meta as any).env?.PROD)
        console.debug('[API] outgoing request', { method, url, 'x-xsrf-token': headers['x-xsrf-token'], cookie_xsrf: getXsrfToken() });
    } catch (e) {
      console.debug('[API] outgoing request dev debug failed', e);
    }

    const response = await fetch(url, {
      ...DEFAULT_FETCH_OPTIONS,
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    // If the server provided a Retry-After header (or custom header), expose it on the returned JSON
    try {
      const headerRetry = response.headers.get('retry-after') || response.headers.get('x-verification-resend-remaining');
      if (headerRetry && typeof data === 'object' && data !== null && typeof data.retryAfter === 'undefined') {
        const asNum = Number(headerRetry);
        if (!Number.isNaN(asNum)) data.retryAfter = asNum;
      }
    } catch (e) {
      console.debug('[API] header parsing failed', e);
    }

    if (!response.ok || data?.success === false) {
      // Handle Unauthorized: if server indicates the error is due to unverified email,
      // return the response body to the caller so the UI can present a helpful flow
      if (response.status === 401) {
        console.warn(`[API] Unauthorized on ${endpoint}`);
        if (data && typeof data.emailVerified !== 'undefined') {
          // Let the caller decide how to present the verification flow
          return data;
        }

        // Attempt silent token refresh before logging out
        // Skip if this IS the refresh request (prevent infinite loop)
        if (!endpoint.includes('/auth/refresh-token') && !endpoint.includes('/auth/logout')) {
          try {
            const refreshXsrf = (await ensureXsrfCookie()) || getXsrfToken();
            const refreshHeaders: Record<string, string> = refreshXsrf ? { "x-xsrf-token": refreshXsrf } : {};
            const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
              method: "POST",
              credentials: "include",
              headers: refreshHeaders,
            });
            if (refreshResp.ok) {
              // Refresh succeeded — retry the original request with fresh token
              if (!(import.meta as any).env?.PROD) console.debug('[API] Token refreshed, retrying', endpoint);
              return handleRequest<T>(endpoint, options);
            }
          } catch (refreshErr) {
            if (!(import.meta as any).env?.PROD) console.debug('[API] Token refresh failed', refreshErr);
          }
        }

        // Refresh failed or not applicable — clear invalid jwt by calling logout (with CSRF)
        try {
          const xsrf = (await ensureXsrfCookie()) || getXsrfToken();
          const logoutHeaders: Record<string, string> = xsrf ? { "x-xsrf-token": xsrf } : {};
          // Dev debug: log the XSRF token we will send for logout
          try {
            if (!(import.meta as any).env?.PROD) console.debug('[API] logout-on-401 will send x-xsrf-token:', xsrf);
          } catch (e) {
            console.debug('[API] logout-on-401 dev debug failed', e);
          }

          const logoutResp = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
            headers: logoutHeaders,
          }).catch((err) => {
            // network error while trying to clear server session; log and continue
            console.debug('[API] logout fetch error:', err);
            return null as any;
          });

          if (logoutResp && !logoutResp.ok) {
            // If server refused the logout (403), still proceed to clear client state
            console.warn('[API] logout returned non-OK status while recovering from 401:', logoutResp.status);
          }
        } catch (e) {
          console.debug('[API] logout error while recovering from 401', e);
        }

        try {
          window.dispatchEvent(new CustomEvent("app:loggedOut"));
        } catch (e) {
          console.debug('[API] app:loggedOut dispatch failed', e);
        }
      }
      const err = new Error(data?.message || `Request failed (${response.status})`);
      try {
        // Attach raw error details (validation errors or body) for client-side handling
        (err as any).details = data?.errors ?? data;
      } catch (e) {
        // ignore attach error
      }
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`[API] ${endpoint} failed:`, error);
    throw error instanceof Error ? error : new Error("Network error");
  }
};

// ======================
// AUTH API
// ======================
export const authAPI = {
  login: (email: string, password: string) =>
    handleRequest<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: { name: string; email: string; password: string; phone?: string }) =>
    handleRequest<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  logout: () =>
    handleRequest("/auth/logout", {
      method: "POST",
    }),

  getMe: () => handleRequest<{ user: User }>("/auth/me"),

  updateMe: (data: Partial<User>) =>
    handleRequest<{ user: User }>("/auth/update-me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updatePassword: (currentPassword: string, newPassword: string) =>
    handleRequest("/auth/update-password", {
      method: "PATCH",
      body: JSON.stringify({ passwordCurrent: currentPassword, password: newPassword }),
    }),

  forgotPassword: (email: string) =>
    handleRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    handleRequest(`/auth/reset-password/${token}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  verifyEmail: (token: string) =>
    handleRequest(`/auth/verify-email/${token}`, {
      method: "GET",
    }),

  resendVerification: (email: string) =>
    handleRequest("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  checkEmail: (email: string) =>
    handleRequest<{ exists: boolean }>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  mergeGuest: (data: { cartItems?: any[]; wishlistItems?: any[] }) =>
    handleRequest("/auth/merge-guest", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  requestEmailChange: (desiredEmail: string, reason?: string) =>
    handleRequest('/auth/request-email-change', {
      method: 'POST',
      body: JSON.stringify({ desiredEmail, reason }),
    }),
};

// ======================
// PRODUCTS, CART, WISHLIST, ORDERS
// ======================
export const productsAPI = {
  getAll: (params?: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) return v.forEach(x => query.append(k, String(x)));
      return query.append(k, String(v));
    });
    return handleRequest<{ products: Product[]; total: number }>(`/products${query.toString() ? "?" + query.toString() : ""}`);
  },
  getFilters: () => handleRequest<any>(`/products/filters`),
  getById: (id: string) => handleRequest<Product>(`/products/${id}`),
  getBySlug: (slug: string) => handleRequest<Product>(`/products/slug/${slug}`),
  getFeatured: () => handleRequest<Product[]>("/products/featured"),
  getRelated: (id: string) => handleRequest<Product[]>(`/products/${id}/related`),
};

// ─── FILTERS API ─── Dynamic filtering system
export const filtersAPI = {
  // Public: Get faceted counts for filter sidebar
  getFacets: (params?: { gender?: string; categorySlug?: string; search?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v) query.append(k, String(v));
    });
    return handleRequest<any>(`/filters/facets${query.toString() ? '?' + query.toString() : ''}`);
  },
  // Public: Get filter config for a category (which filters to show)
  getConfig: (categorySlug: string, gender?: string) => {
    const query = gender ? `?gender=${gender}` : '';
    return handleRequest<any>(`/filters/config/${categorySlug}${query}`);
  },
  // Public: List all filter groups
  getGroups: (enabledOnly?: boolean) =>
    handleRequest<any>(`/filters/groups${enabledOnly ? '?enabled=true' : ''}`),
  // Admin: Create filter group
  createGroup: (data: any) =>
    handleRequest<any>('/filters/groups', { method: 'POST', body: JSON.stringify(data) }),
  // Admin: Update filter group
  updateGroup: (id: string, data: any) =>
    handleRequest<any>(`/filters/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Admin: Delete filter group
  deleteGroup: (id: string) =>
    handleRequest<any>(`/filters/groups/${id}`, { method: 'DELETE' }),
  // Admin: Add option to group
  createOption: (groupId: string, data: any) =>
    handleRequest<any>(`/filters/groups/${groupId}/options`, { method: 'POST', body: JSON.stringify(data) }),
  // Admin: Update option
  updateOption: (id: string, data: any) =>
    handleRequest<any>(`/filters/options/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Admin: Delete option
  deleteOption: (id: string) =>
    handleRequest<any>(`/filters/options/${id}`, { method: 'DELETE' }),
  // Admin: Reorder options
  reorderOptions: (groupId: string, order: { id: string; displayOrder: number }[]) =>
    handleRequest<any>(`/filters/groups/${groupId}/options/reorder`, { method: 'POST', body: JSON.stringify({ order }) }),
  // Admin: List all category filter configs
  getConfigs: () => handleRequest<any>('/filters/configs'),
  // Admin: Set config for a category
  setConfig: (categorySlug: string, data: any) =>
    handleRequest<any>(`/filters/config/${categorySlug}`, { method: 'PUT', body: JSON.stringify(data) }),
};
// Minimal low-level HTTP client used by service wrappers
export const httpClient = {
  get: (endpoint: string) => handleRequest(endpoint),
  post: (endpoint: string, body: any) => handleRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint: string, body?: any) => handleRequest(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint: string) => handleRequest(endpoint, { method: 'DELETE' })
};

export const reviewsAPI = {
  create: (payload: { product: string; rating: number; title?: string; body?: string; images?: any[] }) =>
    handleRequest('/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  listForProduct: (productId: string, page = 1, limit = 10) =>
    handleRequest<{ reviews: any[]; pagination: any }>(`/reviews/product/${productId}?page=${page}&limit=${limit}`),
  summary: (productId: string) => handleRequest<{ summary: { average: number; count: number } }>(`/reviews/summary/${productId}`),
  update: (id: string, payload: { rating?: number; title?: string; body?: string; images?: any[] }) =>
    handleRequest(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id: string) =>
    handleRequest(`/reviews/${id}`, { method: 'DELETE' }),
};

// Public Styled By You
export const styleByYouAPI = {
  getAll: () => handleRequest<{ items: any[] }>(`/style-by-you`),
};

export const cartAPI = {
  get: () => handleRequest<{ items: CartItem[] }>("/cart"),
  addItem: (productId: string, quantity = 1) =>
    handleRequest<{ items: CartItem[] }>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),
  updateItem: (itemId: string, quantity: number) =>
    handleRequest<{ items: CartItem[] }>(`/cart/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (itemId: string) =>
    handleRequest<{ items: CartItem[] }>(`/cart/items/${itemId}`, {
      method: "DELETE",
    }),
  clear: () => handleRequest("/cart/clear", { method: "DELETE" }),
};

export const wishlistAPI = {
  get: () => handleRequest<{ items: Product[] }>("/wishlist"),
  addItem: (productId: string) =>
    handleRequest<{ items: Product[] }>("/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  removeItem: (productId: string) =>
    handleRequest<{ items: Product[] }>(`/wishlist/items/${productId}`, {
      method: "DELETE",
    }),
};

export const ordersAPI = {
  create: (order: any) =>
    handleRequest<{ order: Order }>("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  // Return a top-level { orders } shape for legacy callers (Profile expects res.orders)
  getAll: async () => {
    const res: any = await handleRequest<{ orders: Order[] }>("/orders");
    // backend returns { success: true, data: { orders } } or { orders }
    const orders = (res && res.data && Array.isArray(res.data.orders)) ? res.data.orders : (Array.isArray(res?.orders) ? res.orders : []);
    return { orders };
  },
  getById: (id: string) => handleRequest<{ order: Order }>(`/orders/${id}`),
  validatePromo: (code: string, subtotal: number) =>
    handleRequest<{
      valid: boolean;
      promoCode: PromoCode;
      discountAmount: number;
      discountedSubtotal: number;
      shippingCost: number;
      finalTotal: number;
    }>("/orders/validate-promo", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),
};

// ======================
// ADMIN API
// ======================
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => handleRequest<{
    overview: {
      totalUsers: number;
      totalProducts: number;
      totalOrders: number;
      totalRevenue: number;
      todayOrders: number;
      monthlyRevenue: number;
      yearlyRevenue: number;
      lowStockProducts: number;
      pendingOrders: number;
      growth: {
        users: number;
        products: number;
        orders: number;
        revenue: number;
      };
    };
    charts: {
      weeklySales: any[];
      topProducts: any[];
      userGrowth: any[];
    };
    recent: {
      recentOrders: any[];
      recentUsers: any[];
    };
  }>("/admin/dashboard/stats"),
  
  getRecentActivities: () => handleRequest<any[]>("/admin/dashboard/activities"),

  // Users
  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{
      users: User[];
      pagination: {
        current: number;
        pages: number;
        total: number;
      };
    }>(`/admin/users${query.size ? "?" + query.toString() : ""}`);
  },
  
  getUserById: (id: string) => handleRequest<{ user: User; recentOrders: any[] }>(`/admin/users/${id}`),
  // Filters (admin)
  getFilterGroups: () => handleRequest<any>(`/filters/groups`),
  getCategoryFilterConfigs: () => handleRequest<any>(`/filters/configs`),
  getCategoryFilterConfig: (categorySlug: string) => handleRequest<any>(`/filters/config/${encodeURIComponent(categorySlug)}`),
  setCategoryFilterConfig: (categorySlug: string, payload: any) => handleRequest(`/filters/config/${encodeURIComponent(categorySlug)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createFilterGroup: (payload: any) => handleRequest(`/filters/groups`, { method: 'POST', body: JSON.stringify(payload) }),
  updateFilterGroup: (id: string, payload: any) => handleRequest(`/filters/groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFilterGroup: (id: string) => handleRequest(`/filters/groups/${id}`, { method: 'DELETE' }),
  createFilterOption: (groupId: string, payload: any) => handleRequest(`/filters/groups/${groupId}/options`, { method: 'POST', body: JSON.stringify(payload) }),
  reorderFilterOptions: (groupId: string, order: any[]) => handleRequest(`/filters/groups/${groupId}/options/reorder`, { method: 'POST', body: JSON.stringify({ order }) }),
  
  updateUser: (id: string, data: Partial<User>) =>
    handleRequest<{ user: User }>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  deleteUser: (id: string) =>
    handleRequest(`/admin/users/${id}`, {
      method: "DELETE",
    }),
  
  banUser: (id: string, reason?: string) =>
    handleRequest<{ user: User }>(`/admin/users/${id}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  
  unbanUser: (id: string) =>
    handleRequest<{ user: User }>(`/admin/users/${id}/unban`, {
      method: "PATCH",
    }),

  // Products
  getAllProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{
      products: Product[];
      pagination: {
        current: number;
        pages: number;
        total: number;
      };
    }>(`/admin/products${query.size ? "?" + query.toString() : ""}`);
  },
  // Reviews (admin)
  listReviews: (params?: { page?: number; limit?: number; status?: string; product?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.product) q.set('product', params.product);
    return handleRequest(`/admin/reviews${q.toString() ? `?${q.toString()}` : ''}`);
  },
  approveReview: (id: string) => handleRequest(`/admin/reviews/${id}/approve`, { method: 'PATCH' }),
  rejectReview: (id: string) => handleRequest(`/admin/reviews/${id}/reject`, { method: 'PATCH' }),
  featureReview: (id: string, featured = true) => handleRequest(`/admin/reviews/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured }) }),
  deleteReview: (id: string) => handleRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),
  
  getProductById: (id: string) => handleRequest<{ product: Product }>(`/admin/products/${id}`),
  
  createProduct: (productData: any) =>
    handleRequest<{ product: Product }>("/admin/products", {
      method: "POST",
      body: productData instanceof FormData ? productData : JSON.stringify(productData),
      headers: productData instanceof FormData ? {} : undefined,
    }),
  
  updateProduct: (id: string, productData: any) =>
    handleRequest<{ product: Product }>(`/admin/products/${id}`, {
      method: "PATCH",
      body: productData instanceof FormData ? productData : JSON.stringify(productData),
      headers: productData instanceof FormData ? {} : undefined,
    }),
  
  deleteProduct: (id: string) =>
    handleRequest(`/admin/products/${id}`, {
      method: "DELETE",
    }),
  
  bulkUpdateProducts: (productIds: string[], updateData: any) =>
    handleRequest<{ modifiedCount: number }>("/admin/products/bulk/update", {
      method: "PATCH",
      body: JSON.stringify({ productIds, updateData }),
    }),
  bulkDeleteProducts: (productIds: string[]) =>
    handleRequest<{ deletedCount: number }>("/admin/products/bulk", {
      method: "DELETE",
      body: JSON.stringify({ productIds }),
    }),

  suggestRelatedProducts: (params?: { section?: string; subcategory?: string; tags?: string; excludeId?: string; limit?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{ products: any[] }>(`/admin/products/suggestions${query.size ? "?" + query.toString() : ""}`);
  },

  // Recommendation mapping endpoints
  getRecommendationMappings: (params?: { category?: string; subcategory?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && q.append(k, String(v)));
    return handleRequest<{ mappings: any[] }>(`/admin/recommendation-mappings${q.size ? "?" + q.toString() : ""}`);
  },
  createRecommendationMapping: (payload: any) => handleRequest<{ mapping: any }>(`/admin/recommendation-mappings`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteRecommendationMapping: (id: string) => handleRequest(`/admin/recommendation-mappings/${id}`, { method: 'DELETE' }),

  // Orders
  getAllOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{
      orders: Order[];
      summary: {
        totalRevenue: number;
        averageOrder: number;
        totalOrders: number;
      };
      pagination: {
        current: number;
        pages: number;
        total: number;
      };
    }>(`/admin/orders${query.size ? "?" + query.toString() : ""}`);
  },
  
  getOrderById: (id: string) => handleRequest<{ order: Order }>(`/admin/orders/${id}`),
  
  updateOrderStatus: (id: string, status: string, adminNote?: string) =>
    handleRequest<{ order: Order }>(`/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }),
  
  // Alias for compatibility with existing code
  updateOrderStatusWithNote: (id: string, status: string, adminNote?: string) =>
    handleRequest<{ order: Order }>(`/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }),
  
  updateOrderTracking: (id: string, data: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    trackingUrl?: string;
  }) =>
    handleRequest<{ order: Order }>(`/admin/orders/${id}/tracking`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  cancelOrder: (id: string, reason?: string) =>
    handleRequest<{ order: Order }>(`/admin/orders/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  
  refundOrder: (id: string, amount: number, reason?: string) =>
    handleRequest<{ order: Order }>(`/admin/orders/${id}/refund`, {
      method: "PATCH",
      body: JSON.stringify({ amount, reason }),
    }),

  // Audits
  getAudits: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    actor?: string;
    orderId?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{
      audits: any[];
      pagination: {
        current: number;
        pages: number;
        total: number;
      };
    }>(`/admin/audits${query.size ? "?" + query.toString() : ""}`);
  },

  // Categories
  getAllCategories: () => handleRequest<{ categories: any[] }>("/admin/categories"),
  
  createCategory: (categoryData: any) =>
    handleRequest<{ category: any }>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    }),
  
  updateCategory: (id: string, categoryData: any) =>
    handleRequest<{ category: any }>(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(categoryData),
    }),
  
  deleteCategory: (id: string) =>
    handleRequest(`/admin/categories/${id}`, {
      method: "DELETE",
    }),

  // Size profiles
  getSizeProfiles: (params?: { category?: string; gender?: string; type?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{ profiles: any[] }>(`/admin/size-profiles${query.size ? "?" + query.toString() : ""}`);
  },

  // Analytics
  getSalesAnalytics: (period?: string) =>
    handleRequest<any>(`/admin/analytics/sales${period ? `?period=${period}` : ""}`),
  
  getUserAnalytics: () => handleRequest<any>("/admin/analytics/users"),
  
  getProductAnalytics: () => handleRequest<any>("/admin/analytics/products"),

  // System
  getSystemHealth: () => handleRequest<any>("/admin/system/health"),
  // Feature flags management
  getFeatureFlags: () => handleRequest<{ data: { flags: any[] } }>("/admin/features"),
  createFeatureFlag: (payload: any) => handleRequest<{ flag: any }>("/admin/features", { method: 'POST', body: JSON.stringify(payload) }),
  updateFeatureFlag: (id: string, payload: any) => handleRequest<{ flag: any }>(`/admin/features/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFeatureFlag: (id: string) => handleRequest(`/admin/features/${id}`, { method: 'DELETE' }),
  
  clearCache: () =>
    handleRequest("/admin/system/cache/clear", {
      method: "POST",
    }),
  
  backupDatabase: () =>
    handleRequest("/admin/system/backup", {
      method: "POST",
    }),

  // File Uploads
  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return handleRequest<{ files: Array<{ url: string; filename: string; publicId?: string; isPrimary: boolean; order: number }> }>(
      "/admin/uploads",
      {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary for FormData
      }
    );
  },
  // Style By You (admin)
  getStyleByYou: () => handleRequest<{ items: any[] }>("/admin/style-by-you"),
  createStyleByYou: (formData: FormData) => handleRequest<{ item: any }>("/admin/style-by-you", { method: 'POST', body: formData, headers: {} }),
  updateStyleByYou: (id: string, formData: FormData) => handleRequest<{ item: any }>(`/admin/style-by-you/${id}`, { method: 'PATCH', body: formData, headers: {} }),
  deleteStyleByYou: (id: string) => handleRequest(`/admin/style-by-you/${id}`, { method: 'DELETE' }),
  searchProductsForLink: (q: string) => handleRequest<{ products: any[] }>(`/admin/style-by-you/search/products?q=${encodeURIComponent(q)}`),
  uploadFromUrl: (url: string) => {
    return handleRequest<{ files: Array<{ url: string; filename: string; publicId?: string; isPrimary: boolean; order: number }> }>(
      "/admin/uploads/from-url",
      {
        method: "POST",
        body: JSON.stringify({ url }),
      }
    );
  },
  // Detail Templates (admin)
  getDetailTemplates: () => handleRequest<{ templates: any[] }>(`/admin/detail-templates`),
  createDetailTemplate: (payload: any) => handleRequest<{ template: any }>(`/admin/detail-templates`, { method: 'POST', body: JSON.stringify(payload) }),
  getDetailTemplate: (id: string) => handleRequest<{ template: any }>(`/admin/detail-templates/${id}`),
  updateDetailTemplate: (id: string, payload: any) => handleRequest<{ template: any }>(`/admin/detail-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDetailTemplate: (id: string) => handleRequest(`/admin/detail-templates/${id}`, { method: 'DELETE' }),
  updateProductDetailSections: (productId: string, payload: any) => handleRequest<{ product: any }>(`/admin/products/${productId}/detail-sections`, { method: 'PATCH', body: JSON.stringify(payload) }),
  // Email Marketing
  getSubscribers: (params?: { page?: number; limit?: number; q?: string; source?: string; verified?: boolean; status?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => (v !== undefined && v !== null) && q.append(k, String(v)));
    return handleRequest<{ data: { items: any[]; pagination?: any } }>(`/admin/email-marketing/subscribers${q.toString() ? `?${q.toString()}` : ''}`);
  },
  createCampaign: (payload: { subject: string; content: string; recipientType: string }) =>
    handleRequest(`/admin/email-marketing/campaigns`, { method: 'POST', body: JSON.stringify(payload) }),
  sendCampaignTest: (payload: { to: string; subject: string; content: string }) =>
    handleRequest(`/admin/email-marketing/campaigns/test`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteCampaign: (id: string) => handleRequest(`/admin/email-marketing/campaigns/${id}`, { method: 'DELETE' }),
  listCampaigns: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => (v !== undefined && v !== null) && q.append(k, String(v)));
    return handleRequest<{ data: { items: any[]; pagination?: any } }>(`/admin/email-marketing/campaigns${q.toString() ? `?${q.toString()}` : ''}`);
  },
  // Promo Codes
  getPromoCodes: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return handleRequest<{ promoCodes: PromoCode[]; pagination: { current: number; pages: number; total: number } }>(`/admin/promo-codes${q.size ? `?${q.toString()}` : ''}`);
  },
  getPromoCode: (id: string) => handleRequest<{ promoCode: PromoCode }>(`/admin/promo-codes/${id}`),
  createPromoCode: (payload: Partial<PromoCode>) => handleRequest<{ promoCode: PromoCode }>(`/admin/promo-codes`, { method: 'POST', body: JSON.stringify(payload) }),
  updatePromoCode: (id: string, payload: Partial<PromoCode>) => handleRequest<{ promoCode: PromoCode }>(`/admin/promo-codes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePromoCode: (id: string) => handleRequest(`/admin/promo-codes/${id}`, { method: 'DELETE' }),
  togglePromoCode: (id: string) => handleRequest<{ promoCode: PromoCode }>(`/admin/promo-codes/${id}/toggle`, { method: 'PATCH' }),
};

// ======================
// COLLECTIONS API
// ======================
export const collectionsAPI = {
  // Expect backend to expose /collections that returns { collections: [...] }
  getAll: () => handleRequest<{ collections: any[] }>(`/collections`),
  getBySlug: (slug: string) => handleRequest<any>(`/collections/slug/${slug}`),
};

export const systemAPI = {
  getFeatures: () => handleRequest<{ flags: { raptorMini: boolean } }>("/features"),
};

// ======================
// CONTENT CONTROLLER API
// ======================
export const contentAPI = {
  getPublicContent: () => handleRequest<{ announcements: { messages: string[]; enabled: boolean; intervalSeconds: number }; banners: Record<string, any> }>("/content/public"),
  getAdminContent: () => handleRequest<{ announcements: { messages: string[]; enabled: boolean; intervalSeconds: number }; banners: Record<string, any> }>("/content/admin"),
  updateAnnouncements: (payload: { messages: string[]; enabled?: boolean; intervalSeconds?: number }) =>
    handleRequest<{ announcements: { messages: string[]; enabled: boolean; intervalSeconds: number } }>("/content/admin/announcements", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateBanners: (payload: { banners: Record<string, any> }) =>
    handleRequest<{ banners: Record<string, any> }>("/content/admin/banners", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

// ======================
// SHIPPING API
// ======================
export const shippingAPI = {
  getPublicConfig: () =>
    handleRequest<{
      shippingConfig: {
        shippingFee: number;
        freeShippingThreshold: number;
        isFreeShippingEnabled: boolean;
        isShippingEnabled: boolean;
        estimatedDeliveryDays: string;
      };
    }>("/shipping/config"),

  getAdminConfig: () =>
    handleRequest<{
      shippingConfig: {
        shippingFee: number;
        freeShippingThreshold: number;
        isFreeShippingEnabled: boolean;
        isShippingEnabled: boolean;
        estimatedDeliveryDays: string;
      };
      lastUpdated?: string;
      updatedBy?: any;
    }>("/shipping/admin/config"),

  updateAdminConfig: (payload: {
    shippingFee: number;
    freeShippingThreshold: number;
    isFreeShippingEnabled: boolean;
    isShippingEnabled: boolean;
    estimatedDeliveryDays?: string;
  }) =>
    handleRequest<{
      shippingConfig: {
        shippingFee: number;
        freeShippingThreshold: number;
        isFreeShippingEnabled: boolean;
        isShippingEnabled: boolean;
        estimatedDeliveryDays: string;
      };
    }>("/shipping/admin/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

// Root export
export const api = {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  wishlist: wishlistAPI,
  orders: ordersAPI,
  admin: adminAPI,
  collections: collectionsAPI,
  system: systemAPI,
  content: contentAPI,
  shipping: shippingAPI,
  healthCheck: () => handleRequest("/health"),
};

export default api;
