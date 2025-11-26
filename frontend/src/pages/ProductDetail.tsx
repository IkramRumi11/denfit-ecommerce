// src/pages/ProductDetail.tsx
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, Share2, ArrowLeft, Truck, Shield, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { mockProducts } from '../data/mockProducts';
import FallbackImage from '../components/ui/FallbackImage';
import { primaryImage } from '../utils/productHelpers';

export const ProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const product = mockProducts.find(p => p.id === productId);
  const pid = String(productId ?? product?.id ?? '');

  // FIX: Use useMemo to calculate these values only once
  const { itemsAvailable, reviewsCount } = useMemo(() => {
    if (!product) return { itemsAvailable: 0, reviewsCount: 0 };
    
    // These will be calculated only once when the component mounts
    return {
      itemsAvailable: Math.floor(Math.random() * 50) + 10,
      reviewsCount: Math.floor(Math.random() * 1000) + 100
    };
  }, [product]); // Only recalculate if product changes

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/shop" className="btn-primary">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(product.id) : false;

  const handleAddToCart = () => {
    if (!selectedSize) {
      showToast('Please select a size', 'error');
      return;
    }

    try {
      addItem({
        productId: pid,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        size: selectedSize,
        quantity: quantity
      });

      showToast('Added to cart!', 'success');
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
        id: pid,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        category: product.category,
        rating: product.rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => {
      navigate('/cart');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-square overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <FallbackImage
                src={product.images && product.images[selectedImage] ? (typeof product.images[selectedImage] === 'string' ? product.images[selectedImage] : (product.images[selectedImage] as any).url) : primaryImage(product)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImage === index ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <FallbackImage src={typeof image === 'string' ? image : (image as any).url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="font-medium text-gray-900">{product.rating}</span>
                  {/* FIXED: Use stable reviewsCount from useMemo */}
                  <span className="text-gray-500">({reviewsCount} reviews)</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className={`text-sm font-medium ${
                  product.inStock ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                Rs {product.price.toLocaleString()}
              </p>
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {/* Size Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
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

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-3">
                <div className="flex border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 min-w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                  >
                    +
                  </button>
                </div>
                {/* FIXED: Use stable itemsAvailable from useMemo */}
                <span className="text-sm text-gray-500">
                  {product.inStock ? `${itemsAvailable} items available` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || !selectedSize}
                className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.inStock || !selectedSize}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Buy Now
              </button>
              <button
                onClick={handleWishlistToggle}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`h-6 w-6 ${
                    isWishlisted ? 'text-red-500 fill-current' : 'text-gray-400'
                  }`}
                />
              </button>
              <button
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Share product"
              >
                <Share2 className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-500">Over Rs 5,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-sm text-gray-500">30 days return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-500">100% secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
