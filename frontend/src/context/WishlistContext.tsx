import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI, productsAPI } from '../api';
import { primaryImage } from '../utils/productHelpers';
import { getAvailableQuantity, isOutOfStock } from '../utils/stockHelpers';

// Helper: safely resolve a stable product identifier from various shapes
const resolveProductId = (prod: any): string => {
  if (!prod) return '';
  if (typeof prod === 'string') return prod;
  if (typeof prod === 'number') return String(prod);
  if (typeof prod === 'object') {
    return prod._id || prod.id || prod.slug || prod?.seo?.slug || prod.sku || '';
  }
  return '';
};

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
    let mounted = true;
    const load = async () => {
      try {
        // If user is signed in, load server-side wishlist
        // Otherwise fall back to localStorage
        // eslint-disable-next-line react-hooks/rules-of-hooks
        // (we'll read auth below)
      } catch (e) {}
    };
    load();
    const savedWishlist = localStorage.getItem('denfit-wishlist');
    if (savedWishlist) {
      try {
        const items = JSON.parse(savedWishlist) as WishlistItem[];
        // normalize image field to string URL when possible (some saved shapes store image objects)
        // and filter out invalid ids such as "[object Object]"
        const normalized = items
          .map(it => ({
            ...it,
            image: it?.image && typeof it.image === 'object' ? (it.image.url || '') : (it.image || ''),
            id: String(it.id || it._id || '')
          }))
          .filter(it => it.id && !/^\[object\s.*\]$/.test(it.id));
        dispatch({ type: 'LOAD_WISHLIST', payload: normalized });
      } catch (error) {
        console.error('Error loading wishlist from localStorage:', error);
      }
    }
  }, []);

  // When authenticated, try to sync wishlist from server but don't overwrite local list with empty responses.
  const { user } = useAuth();
  useEffect(() => {
    let mounted = true;
    const loadServerWishlist = async () => {
      if (!user) return;
      try {
        const res: any = await wishlistAPI.get();
        const items = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
        // Map server shape to WishlistItem
        const mapped = items
          .map((i: any) => {
            const prod = i.product || i;
            const id = resolveProductId(prod);
            if (!id) return null; // skip entries we can't resolve to a stable id
            return ({
              id,
              name: prod?.name || '',
              price: prod?.price || 0,
              image: primaryImage(prod),
              category: prod?.category || '',
              rating: 0
            });
          })
          .filter(Boolean) as any[];

        // Merge server list with local saved list to avoid clearing user-local wishlist on refresh
        const saved = localStorage.getItem('denfit-wishlist');
        let localItems: WishlistItem[] = [];
        if (saved) {
          try { localItems = JSON.parse(saved); } catch (e) { localItems = []; }
        }
        const localIds = new Set(localItems.map(it => it.id));
        const merged = [ ...localItems, ...mapped.filter(it => !localIds.has(it.id)) ];

        if (mounted && merged.length > 0) {
          dispatch({ type: 'LOAD_WISHLIST', payload: merged });
        } else if (mounted && localItems.length > 0) {
          // Keep local wishlist if server returns empty
          dispatch({ type: 'LOAD_WISHLIST', payload: localItems });
        }

        // Background enrichment: fetch current stock info for each item
        const enrich = async () => {
          try {
            const promises = merged.map(async (it) => {
              try {
                // Skip invalid ids like "[object Object]" or empty ids
                if (!it.id || (typeof it.id === 'string' && /^\[object\s.*\]$/.test(it.id))) return it;
                const r: any = await productsAPI.getById(String(it.id));
                const product = (r && (r.product || r.data?.product)) ? (r.product || r.data?.product) : (r || r.data || null);
                if (product) {
                  const outOfStock = isOutOfStock(product);
                  return { ...it, price: product.price || it.price, image: primaryImage(product), outOfStock };
                }
              } catch (e) {
                // ignore
              }
              return it;
            });
            const enriched = await Promise.all(promises);
            if (mounted) dispatch({ type: 'LOAD_WISHLIST', payload: enriched });
          } catch (e) {
            // ignore
          }
        };
        enrich();

      } catch (e) {
        console.error('Failed to load server wishlist', e);
      }
    };
    loadServerWishlist();
    return () => { mounted = false; };
  }, [user]);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('denfit-wishlist', JSON.stringify(state.items));
  }, [state.items]);

  // For unauthenticated users, enrich local wishlist items with current product info
  useEffect(() => {
    let mounted = true;
    const enrichLocal = async () => {
      if (user) return; // server sync handles enrichment for authenticated users
      if (!state.items || state.items.length === 0) return;
      // Only enrich if items don't already have outOfStock marker
      if (state.items.every(it => it.outOfStock !== undefined)) return;
      try {
        const promises = state.items.map(async (it) => {
          try {
            if (!it.id || (typeof it.id === 'string' && /^\[object\s.*\]$/.test(it.id))) return it;
            const r: any = await productsAPI.getById(String(it.id));
            const product = (r && (r.product || r.data?.product)) ? (r.product || r.data?.product) : (r || r.data || null);
            if (product) {
              const outOfStock = isOutOfStock(product);
              return { ...it, price: product.price || it.price, image: primaryImage(product), outOfStock };
            }
          } catch (e) {}
          return it;
        });
        const enriched = await Promise.all(promises);
        if (mounted) dispatch({ type: 'LOAD_WISHLIST', payload: enriched });
      } catch (e) {
        // ignore
      }
    };
    enrichLocal();
    return () => { mounted = false; };
  }, [state.items, user]);

  const addToWishlist = async (product: WishlistItem) => {
    // Normalize id consistently
    const normalizedId = String((product as any).id || (product as any)._id || product.id);
    const payload = { ...product, id: normalizedId, image: (product as any)?.image && typeof (product as any).image === 'object' ? ((product as any).image.url || '') : (product as any).image } as WishlistItem;

    // Optimistic update: add immediately so UI reflects change
    dispatch({ type: 'ADD_TO_WISHLIST', payload });

    // Try to persist server-side for authenticated users; rollback on failure
    if (!user) return;
    try {
      const res: any = await wishlistAPI.addItem(payload.id);
      const items = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
      const mapped = items
        .map((i: any) => {
          const prod = i.product || i;
          const id = resolveProductId(prod);
          if (!id) return null;
          return ({
            id,
            name: prod?.name || '',
            price: prod?.price || 0,
            image: primaryImage(prod),
            category: prod?.category || '',
            rating: 0
          });
        })
        .filter(Boolean) as any[];

      // Merge server response with local saved list to avoid accidental clears
      const saved = localStorage.getItem('denfit-wishlist');
      let localItems: WishlistItem[] = [];
      if (saved) {
        try { localItems = JSON.parse(saved); } catch (e) { localItems = []; }
      }
      const localIds = new Set(localItems.map(it => it.id));
      const merged = [ ...localItems, ...mapped.filter(it => !localIds.has(it.id)) ];

      dispatch({ type: 'LOAD_WISHLIST', payload: merged });
      return;
    } catch (e) {
      // rollback optimistic add
      console.error('Failed to persist wishlist item, rolling back optimistic update', e);
      dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: payload.id });
      return;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    // Optimistic removal: remove immediately and save removed item for rollback
    const removed = state.items.find(it => String(it.id) === String(productId));
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });

    if (!user) return;
    try {
      const res: any = await wishlistAPI.removeItem(productId);
      const items = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
      const mapped = items
        .map((i: any) => {
          const prod = i.product || i;
          const id = resolveProductId(prod);
          if (!id) return null;
          return ({
            id,
            name: prod?.name || '',
            price: prod?.price || 0,
            image: primaryImage(prod),
            category: prod?.category || '',
            rating: 0
          });
        })
        .filter(Boolean) as any[];

      // Merge mapped with local fallback
      const saved = localStorage.getItem('denfit-wishlist');
      let localItems: WishlistItem[] = [];
      if (saved) {
        try { localItems = JSON.parse(saved); } catch (e) { localItems = []; }
      }
      const localIds = new Set(localItems.map(it => it.id));
      const merged = [ ...localItems, ...mapped.filter(it => !localIds.has(it.id)) ].filter(it => it.id !== productId);

      dispatch({ type: 'LOAD_WISHLIST', payload: merged });
      return;
    } catch (e) {
      // rollback optimistic remove
      console.error('Failed to remove wishlist item from server, restoring optimistic state', e);
      if (removed) dispatch({ type: 'ADD_TO_WISHLIST', payload: removed });
      return;
    }
  };

  // compatibility wrappers
  const addItem = (product: WishlistItem) => addToWishlist(product);
  const removeItem = (productId: string) => removeFromWishlist(productId);

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
  };

  const isInWishlist = (productId: string): boolean => {
    return state.items.some(item => String(item.id) === String(productId));
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
