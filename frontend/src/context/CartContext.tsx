// frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
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
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// 🔢 Calculate totals
const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 5000 ? 0 : 200;
  const tax = subtotal * 0.13;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
};

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string; size: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; size: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItemIndex = state.items.findIndex(
        (item) => item.productId === action.payload.productId && item.size === action.payload.size
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
      const newItems = state.items.filter(
        (item) => !(item.productId === action.payload.productId && item.size === action.payload.size)
      );
      const totals = calculateTotals(newItems);
      return { ...state, ...totals, items: newItems };
    }

    case "UPDATE_QUANTITY": {
      const newItems = state.items
        .map((item) =>
          item.productId === action.payload.productId && item.size === action.payload.size
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
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
        const items = JSON.parse(savedCart);
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

  const addItem = (item: CartItem) => dispatch({ type: "ADD_ITEM", payload: item });
  const removeItem = (productId: string, size: string) =>
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size } });
  const updateQuantity = (productId: string, size: string, quantity: number) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, size, quantity } });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const getItemCount = () => state.items.reduce((t, i) => t + i.quantity, 0);

  const value: CartContextType = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
