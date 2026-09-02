import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShoppingCart, Star, Heart } from 'lucide-react';

import { useCart } from '../context/CartContext';
import { QuickViewModal } from './QuickViewModal';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { productsAPI } from '../api';
import { primaryImage, productId } from '../utils/productHelpers';
import { isOutOfStock } from '../utils/stockHelpers';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const [quickAddProduct, setQuickAddProduct] = useState<any | null>(null);

  const openQuickAdd = (product: any) => {
    if (!product || isOutOfStock(product)) {
      showToast('Product is out of stock', 'error');
      return;
    }
    setQuickAddProduct(product);
  };

  const closeQuickAdd = () => setQuickAddProduct(null);

  const performAddToCart = (product: any, size: string, color?: string) => {
    try {
      const image = primaryImage(product);
      // resolve variant if color may be a variant id/name/hex
      let variantSnapshot: any = undefined;
      if (Array.isArray(product.variants) && color) {
        variantSnapshot = product.variants.find((v: any) => String(v._id || v.id) === String(color) || String(v.hex || v.normalizedHex || v.value || '').toLowerCase() === String(color).toLowerCase() || String(v.name || '').toLowerCase() === String(color).toLowerCase());
      }
      const colorNormalized = variantSnapshot ? (variantSnapshot.hex || variantSnapshot.name) : (color || (product as any).colorName || (product as any).color || undefined);

      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image,
        size,
        color: colorNormalized,
        colorName: variantSnapshot?.name || (product as any).colorName || undefined,
        variantId: variantSnapshot?.id,
        variantHex: variantSnapshot?.hex,
        quantity: 1
      });
      showToast(`${product.name} added to the cart`, 'success');
      closeQuickAdd();
    } catch (error) {
      console.error('Error adding to cart from search:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res: any = await productsAPI.getAll({ search: query.trim(), limit: 6 });
        // API returns { products, total } or { products: [] }
        const products = res && res.products ? res.products : (res?.data?.products || []);
        if (!active) return;
        setResults(Array.isArray(products) ? products : []);
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('Search API failed', err);
        showToast('Search failed', 'error');
      }
    }, 220);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(id);
    };
  }, [query]);

  // Open quick-add selection instead of default-adding
  const handleAddToCart = (product: any) => openQuickAdd(product);

  const handleWishlistToggle = (product: any) => {
    const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(product.id) : false;
    
    if (isWishlisted) {
      removeFromWishlist(product.id);
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        category: product.category,
        rating: product.rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const isProductInWishlist = (productId: string): boolean => {
    return typeof isInWishlist === 'function' ? isInWishlist(productId) : false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the input for accessibility without using autoFocus prop
      inputRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for products, categories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 focus:ring-0 text-lg placeholder-gray-500"
                ref={inputRef}
              />
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Search Results */}
          <div className="overflow-y-auto max-h-[60vh]">
            {results.length > 0 ? (
              <div className="p-4 space-y-3">
                        {results.map((product, i) => (
                          <motion.div
                            key={productId(product) || `search-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <img
                      src={primaryImage(product)}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{product.rating}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-600 capitalize">
                          {product.category}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-blue-600 mt-1">
                        Rs {product.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleWishlistToggle(product)}
                        className={`p-2 rounded-lg transition-colors ${
                          isProductInWishlist(product.id)
                            ? 'text-red-500 bg-red-50'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={isProductInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`h-4 w-4 ${isProductInWishlist(product.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products found for "{query}"</p>
                <p className="text-gray-400 text-sm mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Start typing to search for products</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
      {/* Quick-add modal for search results */}
      {quickAddProduct ? (
        <QuickViewModal
          product={quickAddProduct}
          isOpen={!!quickAddProduct}
          onClose={closeQuickAdd}
          onAddToCart={(size: string, color?: string) => performAddToCart(quickAddProduct, size, color)}
        />
      ) : null}
    </>
  );
};
