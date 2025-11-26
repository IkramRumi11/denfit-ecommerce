// src/components/ProductCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, Eye, ShoppingCart } from 'lucide-react';
import FallbackImage from './ui/FallbackImage';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { QuickViewModal } from './QuickViewModal';
import type { Product } from '../types';
import { productId, primaryImage, priceNumber } from '../utils/productHelpers';

export interface ProductCardProps {
  product: Product;
  onAddToCart: (size: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string>((product.sizes && product.sizes[0]) || 'M');
  const [showQuickView, setShowQuickView] = useState(false);

  const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(productId(product)) : false;

  const handleAddToCart = () => {
    onAddToCart(selectedSize);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      removeFromWishlist(productId(product));
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: productId(product),
        name: product.name,
        price: priceNumber(product),
        image: primaryImage(product),
        category: product.category ?? '',
        rating: (product as any).rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  const handleViewDetails = () => {
    navigate(`/product/${productId(product)}`);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      >
        <div className="relative overflow-hidden">
          <button
            type="button"
            className="cursor-pointer w-full text-left"
            onClick={handleViewDetails}
          >
            <FallbackImage
              src={primaryImage(product)}
              alt={product.name}
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>

          {/* Badges */}
          <div className="absolute top-3 left-3">
            {!product.inStock && (
              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                Out of Stock
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleWishlistToggle}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                isWishlisted
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
              title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                className={`h-4 w-4 ${
                  isWishlisted ? 'fill-current' : ''
                }`}
              />
            </button>
            <button
              onClick={handleQuickView}
              className="p-2 bg-white/90 rounded-full backdrop-blur-sm text-gray-700 hover:bg-white transition-colors"
              title="Quick view"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          {product.inStock && (
            <div className="absolute bottom-3 left-3 right-3">
              <button
                onClick={handleAddToCart}
                className="w-full bg-black text-white py-2 rounded-lg font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
              <button
                type="button"
                onClick={handleViewDetails}
                className="text-left w-full"
              >
                {product.name}
              </button>
            </h3>
          </div>

          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-900">{(product as any).rating}</span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              Rs {priceNumber(product).toLocaleString()}
            </span>
          </div>

          {/* Size Selection */}
          <div className="flex gap-1 mb-3">
            {(product.sizes || []).map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-2 py-1 text-xs border rounded transition-all ${
                  selectedSize === size
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* View Details Button */}
          <button
            onClick={handleViewDetails}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block"
          >
            View Details
          </button>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product as any}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
        onAddToCart={onAddToCart}
      />
    </>
  );
};
