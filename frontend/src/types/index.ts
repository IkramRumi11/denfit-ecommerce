// src/types/index.ts
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  emailVerified: boolean;
  // compatibility alias used in some components
  verified?: boolean;
  // Optional permission keys assigned to the user (frontend can use this for RBAC display)
  permissions?: string[];
  addresses: Address[];
  preferences: {
    newsletter: boolean;
    emailNotifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface Product {
  // Accept either id or _id (many parts of the codebase use one or the other)
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  // Normalize price to number to avoid repeated runtime parsing
  price: number;
  originalPrice?: number;
  // Images should be an array; components expect indexing and map operations
  images: string[];
  // Backwards compat single-image field
  image?: string;
  // Taxonomy fields
  category?: string;
  type?: string; // e.g. t-shirts, hoodies
  gender?: 'men' | 'women' | 'unisex' | string;
  // Sizes default to provided arrays in datasets; keep sizes required
  sizes: string[];
  // colors and ratings may be absent in some datasets
  colors?: string[];
  inventory?: number;
  inStock?: boolean;
  featured?: boolean;
  slug?: string;
  // Ratings & SEO & specifications commonly used in UI
  rating?: number;
  reviewCount?: number;
  reviewsCount?: number;
  ratings?: { average: number; count: number };
  seo?: { slug?: string };
  specifications?: {
    material?: string;
    care?: string;
    fit?: string;
    origin?: string;
  };
  tags?: string[];
  sizeGuide?: {
    image?: string;
    description?: string;
    tableHtml?: string;
  };
  availableSizes?: string[];
  // New variant-aware structure
  variants?: Variant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Variant {
  id?: string;
  _id?: string;
  name?: string; // display name e.g. 'Black'
  hex?: string; // swatch color
  swatchImage?: { url: string } | string;
  images?: Array<string | { url: string }>;
  availableSizes?: string[];
  inventory?: number;
}

export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
  size: string;
  // variant snapshot stored at add-to-cart time
  variantId?: string;
  variantName?: string;
  variantHex?: string;
  variantImage?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  size: string;
  color: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  meta?: Record<string, any>;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
  timeout?: number;
  // Older code uses `duration` — keep this alias for compatibility
  duration?: number;
}