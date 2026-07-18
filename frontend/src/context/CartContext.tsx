// frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { TAX_FEATURE } from "../config/taxFeatureFlag";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color?: string;
  colorName?: string;
  // Optional variant snapshot
  variantId?: string;
  variantName?: string;
  variantHex?: string;
  variantImage?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

interface CartContextType extends CartState {
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// 🔢 Calculate totals
const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Shipping: free for orders >= 5000, otherwise flat Rs.300
  const shipping = subtotal >= 5000 ? 0 : 300;
  // TAX SYSTEM FORCED OFF: always set tax to zero for customer-facing totals
  const tax = 0;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
};

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string; size: string; color?: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; size: string; color?: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const payloadColorKey = String(action.payload.color ?? action.payload.variantHex ?? action.payload.variantName ?? '');

      const colorMatches = (item: CartItem, key: string) => {
        if (!key) return !(item.color || item.variantHex || item.variantName);
        return (item.color && String(item.color) === key) || (item.variantHex && String(item.variantHex) === key) || (item.variantName && String(item.variantName) === key);
      };

      const existingItemIndex = state.items.findIndex(
        (item) => item.productId === action.payload.productId && item.size === action.payload.size && colorMatches(item, payloadColorKey)
      );
      let newItems;
      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newItems = [...state.items, action.payload];
      }
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "REMOVE_ITEM": {
      const matchesRemove = (item: CartItem, payload: { productId: string; size: string; color?: string }) => {
        if (item.productId !== payload.productId) return false;
        if (item.size !== payload.size) return false;
        if (!payload.color) return true;
        const pc = String(payload.color);
        return (item.color && String(item.color) === pc) || (item.variantHex && String(item.variantHex) === pc) || (item.variantName && String(item.variantName) === pc);
      };

      const newItems = state.items.filter((item) => !matchesRemove(item, action.payload));
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "UPDATE_QUANTITY": {
      const newItems = state.items
        .map((item) => {
          const sameProduct = item.productId === action.payload.productId && item.size === action.payload.size;
          const colorMatch = !action.payload.color || ( (item.color && String(item.color) === String(action.payload.color)) || (item.variantHex && String(item.variantHex) === String(action.payload.color)) || (item.variantName && String(item.variantName) === String(action.payload.color)) );
          return sameProduct && colorMatch ? { ...item, quantity: action.payload.quantity } : item;
        })
        .filter((item) => item.quantity > 0);
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "CLEAR_CART":
      return { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 };

    case "LOAD_CART": {
      const totals = calculateTotals(action.payload);
      return { ...state, ...totals, items: action.payload };
    }

    default:
      return state;
  }
};

// Normalize an incoming cart item to safe primitives
function sanitizeCartItem(input: any): CartItem {
  const safe: any = {};
  safe.productId = String(input?.productId ?? input?.id ?? '');
  safe.name = String(input?.name ?? '');
  safe.price = Number(input?.price) || 0;
  // image may be string or object
  if (typeof input?.image === 'string') safe.image = input.image;
  else if (input?.image && typeof input.image === 'object') {
    // Support common image object shapes from API or Cloudinary
    safe.image = input.image.url || input.image.secure_url || input.image.src || (input.image.filename ? (`/uploads/${input.image.filename}`) : '') || '';
  } else safe.image = String(input?.image ?? '');
  // size may be primitive or object
  if (input?.size == null) safe.size = '';
  else if (typeof input.size === 'string' || typeof input.size === 'number') safe.size = String(input.size);
  else if (typeof input.size === 'object') {
    safe.size = String(input.size.value ?? input.size.size ?? input.size.label ?? input.size.name ?? JSON.stringify(input.size));
  } else safe.size = String(input.size);
  safe.color = input?.color == null ? undefined : String(input.color);
  safe.colorName = input?.colorName == null ? undefined : String(input.colorName);
  safe.variantId = input?.variantId ? String(input.variantId) : undefined;
  safe.variantName = input?.variantName ? String(input.variantName) : undefined;
  safe.variantHex = input?.variantHex ? String(input.variantHex) : undefined;
  safe.variantImage = input?.variantImage ? String(input.variantImage) : undefined;
  safe.quantity = Number(input?.quantity) || 1;
  return safe as CartItem;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  shipping: 0,
  tax: 0,
  total: 0,
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // ✅ Load cart from localStorage once
  useEffect(() => {
    const savedCart = localStorage.getItem("denfit-cart");
    if (savedCart) {
      try {
        const raw = JSON.parse(savedCart);
        const items = Array.isArray(raw) ? raw.map(sanitizeCartItem) : [];
        dispatch({ type: "LOAD_CART", payload: items });
      } catch (error) {
        console.error("Error parsing cart:", error);
      }
    }
  }, []);

  // ✅ Save cart with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("denfit-cart", JSON.stringify(state.items));
    }, 200);
    return () => clearTimeout(timeout);
  }, [state.items]);

  // Ensure externally-provided items are normalized before dispatching
  const addItemSafe = (item: any) => dispatch({ type: "ADD_ITEM", payload: sanitizeCartItem(item) });
  const removeItem = (productId: string, size: string, color?: string) =>
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size, color } });
  const updateQuantity = (productId: string, size: string, quantity: number, color?: string) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, size, color, quantity } });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const getItemCount = () => state.items.reduce((t, i) => t + i.quantity, 0);

  const value: CartContextType = {
    ...state,
    addItem: addItemSafe as any,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    // Development-time safe fallback: avoid throwing so a missing provider
    // doesn't crash the whole app. Log a helpful warning and return a
    // no-op context that preserves component behavior.
    // If you see this warning in production, ensure the app root wraps
    // components with `<CartProvider>` (see `src/main.tsx`).
    // eslint-disable-next-line no-console
    console.warn('useCart called outside CartProvider — returning fallback no-op cart context');
    const fallback: CartContextType = {
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      addItem: () => { /* no-op */ },
      removeItem: () => { /* no-op */ },
      updateQuantity: () => { /* no-op */ },
      clearCart: () => { /* no-op */ },
      getItemCount: () => 0,
    };
    return fallback;
  }
  return context;
};
