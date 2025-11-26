import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShoppingCart, Star, Heart } from 'lucide-react';

import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { mockProducts } from '../data/mockProducts';
import { primaryImage } from '../utils/productHelpers';

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

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (query.trim()) {
      const filtered = mockProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 6));
    } else {
      setResults([]);
    }
  }, [query]);

  // FIX: Proper add to cart function
  const handleAddToCart = (product: any) => {
    try {
      console.log('🛒 Adding to cart from search:', product.name);
      
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        size: 'M',
        quantity: 1
      });
      
      showToast('Added to cart!', 'success');
    } catch (error) {
      console.error('❌ Error adding to cart from search:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

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
                        {results.map((product) => (
                  <motion.div
                    key={product.id}
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
  );
};
