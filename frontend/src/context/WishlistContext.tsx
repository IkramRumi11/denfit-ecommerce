import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
}

interface WishlistState {
  items: WishlistItem[];
}

interface WishlistContextType extends WishlistState {
  addToWishlist: (product: WishlistItem) => void;
  removeFromWishlist: (productId: string) => void;
  // compatibility aliases
  addItem: (product: WishlistItem) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
  getWishlistCount: () => number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

type WishlistAction =
  | { type: 'ADD_TO_WISHLIST'; payload: WishlistItem }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'LOAD_WISHLIST'; payload: WishlistItem[] };

const wishlistReducer = (state: WishlistState, action: WishlistAction): WishlistState => {
  switch (action.type) {
    case 'ADD_TO_WISHLIST': {
      // Check if item already exists
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return state; // Item already in wishlist
      }
      return { items: [...state.items, action.payload] };
    }

    case 'REMOVE_FROM_WISHLIST': {
      return { items: state.items.filter(item => item.id !== action.payload) };
    }

    case 'CLEAR_WISHLIST':
      return { items: [] };

    case 'LOAD_WISHLIST':
      return { items: action.payload };

    default:
      return state;
  }
};

const initialState: WishlistState = {
  items: []
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem('denfit-wishlist');
    if (savedWishlist) {
      try {
        const items = JSON.parse(savedWishlist);
        dispatch({ type: 'LOAD_WISHLIST', payload: items });
      } catch (error) {
        console.error('Error loading wishlist from localStorage:', error);
      }
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('denfit-wishlist', JSON.stringify(state.items));
  }, [state.items]);

  const addToWishlist = (product: WishlistItem) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: product });
  };

  const removeFromWishlist = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });
  };

  // compatibility wrappers
  const addItem = (product: WishlistItem) => addToWishlist(product);
  const removeItem = (productId: string) => removeFromWishlist(productId);

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
  };

  const isInWishlist = (productId: string): boolean => {
    return state.items.some(item => item.id === productId);
  };

  const getWishlistCount = (): number => {
    return state.items.length;
  };

  const value: WishlistContextType = {
    items: state.items,
    addToWishlist,
    removeFromWishlist,
    addItem,
    removeItem,
    clearWishlist,
    isInWishlist,
    getWishlistCount
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

// In your WishlistContext, ensure it always returns a valid state
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
