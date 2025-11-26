// frontend/src/api.ts
import { Product, User, CartItem, Order, ApiResponse } from "./types";

const env = (import.meta as any).env;
const API_BASE_URL = env.PROD
  ? (env.VITE_API_URL || "").replace(/\/$/, "")
  : "/api/v1";

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
  const url = `${API_BASE_URL}${endpoint}`;

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
      ...options,
      headers,
      credentials: "include", // always send cookies
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

        // clear invalid jwt by calling logout (with CSRF)
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
      throw new Error(data?.message || `Request failed (${response.status})`);
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
};

// ======================
// PRODUCTS, CART, WISHLIST, ORDERS
// ======================
export const productsAPI = {
  getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && query.append(k, String(v)));
    return handleRequest<{ products: Product[]; total: number }>(
      `/products${query.size ? "?" + query.toString() : ""}`
    );
  },
  getById: (id: string) => handleRequest<Product>(`/products/${id}`),
  getBySlug: (slug: string) => handleRequest<Product>(`/products/slug/${slug}`),
  getFeatured: () => handleRequest<Product[]>("/products/featured"),
  getRelated: (id: string) => handleRequest<Product[]>(`/products/${id}/related`),
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
  getAll: () => handleRequest<{ orders: Order[] }>("/orders"),
  getById: (id: string) => handleRequest<{ order: Order }>(`/orders/${id}`),
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
  
  getProductById: (id: string) => handleRequest<{ product: Product }>(`/admin/products/${id}`),
  
  createProduct: (productData: any) =>
    handleRequest<{ product: Product }>("/admin/products", {
      method: "POST",
      body: JSON.stringify(productData),
    }),
  
  updateProduct: (id: string, productData: any) =>
    handleRequest<{ product: Product }>(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(productData),
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

  // Analytics
  getSalesAnalytics: (period?: string) =>
    handleRequest<any>(`/admin/analytics/sales${period ? `?period=${period}` : ""}`),
  
  getUserAnalytics: () => handleRequest<any>("/admin/analytics/users"),
  
  getProductAnalytics: () => handleRequest<any>("/admin/analytics/products"),

  // System
  getSystemHealth: () => handleRequest<any>("/admin/system/health"),
  
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
};

// Root export
export const api = {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  wishlist: wishlistAPI,
  orders: ordersAPI,
  admin: adminAPI,
  healthCheck: () => handleRequest("/health"),
};

export default api;
