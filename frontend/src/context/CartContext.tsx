// frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { TAX_FEATURE } from "../config/taxFeatureFlag";
import { getColorName, resolveColorHex } from "../utils/colorNames";

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
  maxStock?: number;
}

export interface AddItemResult {
  success: boolean;
  addedQuantity: number;
  currentInCart: number;
  maxStock?: number;
  reason?: 'FULL_ADD' | 'PARTIAL_ADD' | 'MAX_REACHED' | 'OUT_OF_STOCK';
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

interface CartContextType extends CartState {
  addItem: (item: CartItem, maxStock?: number) => AddItemResult;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string, maxStock?: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getItemQuantity: (productId: string, size?: string, color?: string, variantId?: string) => number;
  adjustItemToMaxStock: (productId: string, size: string, maxStock: number, color?: string) => void;
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
  | { type: "ADD_ITEM"; payload: { item: CartItem; maxStock?: number } }
  | { type: "REMOVE_ITEM"; payload: { productId: string; size: string; color?: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; size: string; color?: string; quantity: number; maxStock?: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

const normalizeStr = (v?: string | null) => String(v || '').trim().toLowerCase();

export const areProductIdsMatching = (idA?: string | null, idB?: string | null): boolean => {
  const a = normalizeStr(idA);
  const b = normalizeStr(idB);
  if (!a || !b) return false;
  return a === b;
};

export const areSizesMatching = (sizeA?: string | null, sizeB?: string | null): boolean => {
  const a = normalizeStr(sizeA).replace(/[\s-_]+/g, '');
  const b = normalizeStr(sizeB).replace(/[\s-_]+/g, '');
  if (!a && !b) return true;
  return a === b;
};

export const areColorsMatching = (itemA: Partial<CartItem>, itemB: Partial<CartItem> | any): boolean => {
  // If both have variantId and they match
  if (itemA?.variantId && itemB?.variantId) {
    if (normalizeStr(itemA.variantId) === normalizeStr(itemB.variantId)) return true;
  }

  // Collect color tokens for item A
  const tokensA = new Set<string>();
  [itemA.variantId, itemA.variantHex, itemA.color, itemA.colorName, itemA.variantName]
    .filter(Boolean)
    .forEach((val) => {
      const norm = normalizeStr(val);
      if (!norm) return;
      tokensA.add(norm);
      const hex = resolveColorHex(val);
      if (hex) tokensA.add(normalizeStr(hex));
      const name = getColorName(val);
      if (name) tokensA.add(normalizeStr(name));
    });

  // Collect color tokens for item B
  const tokensB = new Set<string>();
  const bObj = typeof itemB === 'string' ? { color: itemB } : (itemB || {});
  [bObj.variantId, bObj.variantHex, bObj.color, bObj.colorName, bObj.variantName]
    .filter(Boolean)
    .forEach((val) => {
      const norm = normalizeStr(val);
      if (!norm) return;
      tokensB.add(norm);
      const hex = resolveColorHex(val);
      if (hex) tokensB.add(normalizeStr(hex));
      const name = getColorName(val);
      if (name) tokensB.add(normalizeStr(name));
    });

  // If neither has any color tokens, treat as matching default
  if (tokensA.size === 0 && tokensB.size === 0) return true;
  // If one item has no color specified (e.g. added via a size-only click), match default
  if (tokensA.size === 0 || tokensB.size === 0) return true;

  // Check token intersection
  for (const t of tokensA) {
    if (tokensB.has(t)) return true;
  }

  return false;
};

export const areCartItemsEqual = (a: CartItem, b: CartItem | any): boolean => {
  if (!areProductIdsMatching(a.productId, b.productId)) return false;
  if (!areSizesMatching(a.size, b.size)) return false;
  return areColorsMatching(a, b);
};

export const colorMatches = (item: CartItem, key: string) => {
  if (!key) return true;
  return areColorsMatching(item, { color: key });
};

// Merge two matching cart items into one complete item
const mergeCartItemDetails = (target: CartItem, source: CartItem): CartItem => {
  const resolvedColorName = target.colorName || source.colorName || (target.color ? getColorName(target.color) : (source.color ? getColorName(source.color) : undefined));
  const resolvedHex = target.variantHex || source.variantHex || (resolvedColorName ? resolveColorHex(resolvedColorName) : undefined) || (target.color?.startsWith('#') ? target.color : (source.color?.startsWith('#') ? source.color : undefined));
  const resolvedColor = resolvedHex || target.color || source.color || resolvedColorName;

  return {
    ...target,
    color: resolvedColor,
    colorName: resolvedColorName,
    variantHex: resolvedHex,
    variantName: target.variantName || source.variantName || resolvedColorName,
    variantId: target.variantId || source.variantId,
    variantImage: target.variantImage || source.variantImage,
    image: target.image || source.image,
    maxStock: target.maxStock ?? source.maxStock,
  };
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const incomingItem = action.payload.item;
      const maxStock = action.payload.maxStock;

      const existingItemIndex = state.items.findIndex((item) => areCartItemsEqual(item, incomingItem));

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        const existing = state.items[existingItemIndex];
        let targetQty = existing.quantity + incomingItem.quantity;
        if (typeof maxStock === 'number' && maxStock >= 0) {
          targetQty = Math.min(targetQty, maxStock);
        }
        if (targetQty <= 0) {
          newItems = state.items.filter((_, idx) => idx !== existingItemIndex);
        } else {
          newItems = state.items.map((item, index) => {
            if (index === existingItemIndex) {
              const merged = mergeCartItemDetails(item, incomingItem);
              return { ...merged, quantity: targetQty, maxStock: maxStock ?? merged.maxStock };
            }
            return item;
          });
        }
      } else {
        let initialQty = incomingItem.quantity;
        if (typeof maxStock === 'number' && maxStock >= 0) {
          initialQty = Math.min(initialQty, maxStock);
        }
        if (initialQty > 0) {
          newItems = [...state.items, { ...incomingItem, quantity: initialQty, maxStock }];
        } else {
          newItems = [...state.items];
        }
      }
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter((item) => !areCartItemsEqual(item, action.payload));
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "UPDATE_QUANTITY": {
      const maxStock = action.payload.maxStock;
      const newItems = state.items
        .map((item) => {
          if (areCartItemsEqual(item, action.payload)) {
            let finalQty = action.payload.quantity;
            if (typeof maxStock === 'number' && maxStock >= 0) {
              finalQty = Math.min(finalQty, maxStock);
            }
            return { ...item, quantity: finalQty, maxStock: maxStock ?? item.maxStock };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "CLEAR_CART":
      return { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 };

    case "LOAD_CART": {
      // Deduplicate and merge any existing duplicates
      const merged: CartItem[] = [];
      for (const raw of action.payload) {
        const item = sanitizeCartItem(raw);
        const existingIdx = merged.findIndex((m) => areCartItemsEqual(m, item));
        if (existingIdx >= 0) {
          const combined = mergeCartItemDetails(merged[existingIdx], item);
          merged[existingIdx] = {
            ...combined,
            quantity: combined.quantity + item.quantity,
          };
        } else {
          merged.push(item);
        }
      }
      const totals = calculateTotals(merged);
      return { ...state, ...totals, items: merged };
    }

    default:
      return state;
  }
};

// Normalize an incoming cart item to safe primitives with full color enrichment
function sanitizeCartItem(input: any): CartItem {
  const safe: any = {};
  safe.productId = String(input?.productId ?? input?.id ?? input?._id ?? '');
  safe.name = String(input?.name ?? '');
  safe.price = Number(input?.price) || 0;
  if (typeof input?.image === 'string') safe.image = input.image;
  else if (input?.image && typeof input.image === 'object') {
    safe.image = input.image.url || input.image.secure_url || input.image.src || (input.image.filename ? (`/uploads/${input.image.filename}`) : '') || '';
  } else safe.image = String(input?.image ?? '');

  if (input?.size == null) safe.size = '';
  else if (typeof input.size === 'string' || typeof input.size === 'number') safe.size = String(input.size);
  else if (typeof input.size === 'object') {
    safe.size = String(input.size.value ?? input.size.size ?? input.size.label ?? input.size.name ?? JSON.stringify(input.size));
  } else safe.size = String(input.size);

  const rawColor = input?.color == null ? undefined : String(input.color);
  const rawColorName = input?.colorName == null ? undefined : String(input.colorName);
  const rawVariantName = input?.variantName ? String(input.variantName) : undefined;
  const rawVariantHex = input?.variantHex ? String(input.variantHex) : undefined;

  const colorName = rawColorName || rawVariantName || (rawColor ? getColorName(rawColor) : undefined);
  const variantHex = rawVariantHex || (colorName ? resolveColorHex(colorName) : undefined) || (rawColor?.startsWith('#') ? rawColor : undefined);
  const color = variantHex || rawColor || colorName;

  safe.color = color;
  safe.colorName = colorName;
  safe.variantId = input?.variantId ? String(input.variantId) : undefined;
  safe.variantName = rawVariantName || colorName;
  safe.variantHex = variantHex;
  safe.variantImage = input?.variantImage ? String(input.variantImage) : undefined;
  safe.quantity = Math.max(1, Number(input?.quantity) || 1);
  if (typeof input?.maxStock === 'number') safe.maxStock = input.maxStock;
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

  const getItemQuantity = (productId: string, size?: string, color?: string, variantId?: string): number => {
    const targetPid = String(productId || '');
    if (!targetPid) return 0;
    const queryItem: any = { productId: targetPid, size, color, variantId };

    return state.items
      .filter((item) => {
        if (!areProductIdsMatching(item.productId, targetPid)) return false;
        if (size && !areSizesMatching(item.size, size)) return false;
        if (color || variantId) {
          if (!areColorsMatching(item, queryItem)) return false;
        }
        return true;
      })
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const addItemSafe = (rawItem: any, maxStock?: number): AddItemResult => {
    const item = sanitizeCartItem(rawItem);
    const effectiveMaxStock = typeof maxStock === 'number' ? maxStock : (typeof rawItem.maxStock === 'number' ? rawItem.maxStock : undefined);
    const currentQty = getItemQuantity(item.productId, item.size, item.color || item.variantHex || item.colorName, item.variantId);

    if (typeof effectiveMaxStock === 'number') {
      if (effectiveMaxStock <= 0) {
        return {
          success: false,
          addedQuantity: 0,
          currentInCart: currentQty,
          maxStock: 0,
          reason: 'OUT_OF_STOCK'
        };
      }
      if (currentQty >= effectiveMaxStock) {
        return {
          success: false,
          addedQuantity: 0,
          currentInCart: currentQty,
          maxStock: effectiveMaxStock,
          reason: 'MAX_REACHED'
        };
      }
      const allowedToAdd = Math.min(item.quantity, effectiveMaxStock - currentQty);
      dispatch({ type: "ADD_ITEM", payload: { item: { ...item, quantity: allowedToAdd }, maxStock: effectiveMaxStock } });
      return {
        success: true,
        addedQuantity: allowedToAdd,
        currentInCart: currentQty + allowedToAdd,
        maxStock: effectiveMaxStock,
        reason: allowedToAdd < item.quantity ? 'PARTIAL_ADD' : 'FULL_ADD'
      };
    }

    dispatch({ type: "ADD_ITEM", payload: { item, maxStock: undefined } });
    return {
      success: true,
      addedQuantity: item.quantity,
      currentInCart: currentQty + item.quantity,
      reason: 'FULL_ADD'
    };
  };

  const removeItem = (productId: string, size: string, color?: string) =>
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size, color } });

  const updateQuantity = (productId: string, size: string, quantity: number, color?: string, maxStock?: number) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, size, color, quantity, maxStock } });

  const adjustItemToMaxStock = (productId: string, size: string, maxStock: number, color?: string) => {
    if (maxStock <= 0) {
      removeItem(productId, size, color);
    } else {
      updateQuantity(productId, size, maxStock, color, maxStock);
    }
  };

  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const getItemCount = () => state.items.reduce((t, i) => t + i.quantity, 0);

  const value: CartContextType = {
    ...state,
    addItem: addItemSafe,
    removeItem,
    updateQuantity,
    adjustItemToMaxStock,
    clearCart,
    getItemCount,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    console.warn('useCart called outside CartProvider — returning fallback no-op cart context');
    const fallback: CartContextType = {
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      addItem: () => ({ success: false, addedQuantity: 0, currentInCart: 0 }),
      removeItem: () => { /* no-op */ },
      updateQuantity: () => { /* no-op */ },
      adjustItemToMaxStock: () => { /* no-op */ },
      clearCart: () => { /* no-op */ },
      getItemCount: () => 0,
      getItemQuantity: () => 0,
    };
    return fallback;
  }
  return context;
};
