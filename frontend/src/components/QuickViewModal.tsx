// src/components/QuickViewModal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { primaryImage } from '../utils/productHelpers';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  sizes: string[];
  inStock: boolean;
  rating: number;
  category: string;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (size: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  if (!product) return null;

  const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(product.id) : false;

  const handleAddToCart = () => {
    if (!selectedSize) {
      showToast('Please select a size', 'error');
      return;
    }

    try {
      if (onAddToCart) {
        onAddToCart(selectedSize);
      } else {
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: primaryImage(product as any),
          size: selectedSize,
          quantity: 1
        });
      }
      
      showToast('Added to cart!', 'success');
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleWishlistToggle = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage(product as any),
        category: product.category,
        rating: product.rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleViewFullDetails = () => {
    onClose();
    navigate(`/product/${product.id}`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Quick View</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                {/* Images */}
                <div className="space-y-4">
                  <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={product.images && product.images[selectedImage] ? (typeof product.images[selectedImage] === 'string' ? product.images[selectedImage] : (product.images[selectedImage] as any).url) : primaryImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((image, index) => {
                      const src = typeof image === 'string' ? image : (image as any)?.url;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`aspect-square overflow-hidden rounded-lg border transition-all ${
                            selectedImage === index
                              ? 'border-blue-600 border-2'
                              : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={src}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium text-gray-900">{product.rating}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className={`text-sm font-medium ${
                        product.inStock ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                      Rs {product.price.toLocaleString()}
                    </p>
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.description}
                  </p>

                  {/* Size Selection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Select Size</h4>
                    <div className="flex gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 border rounded-lg font-medium transition-all ${
                            selectedSize === size
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAddToCart}
                      disabled={!product.inStock || !selectedSize}
                      className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 border rounded-lg transition-colors flex items-center justify-center ${
                        isWishlisted
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-300 text-gray-400 hover:border-gray-400'
                      }`}
                      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isWishlisted ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={handleViewFullDetails}
                    className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
