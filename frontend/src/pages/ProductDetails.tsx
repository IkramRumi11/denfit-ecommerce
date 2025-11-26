// src/pages/ProductDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Star, 
  Truck, 
  Shield, 
  ArrowLeft,
  Check,
  Minus,
  Plus
} from 'lucide-react';

import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { generateProducts } from '../utils/generateProducts';
import { formatCurrency } from '../utils/formatCurrency';
import { Product } from '../types';
import FallbackImage from '../components/ui/FallbackImage';
import { primaryImage } from '../utils/productHelpers';

export const ProductDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // FIX: Use useMemo for stable values
  const { itemsAvailable, reviewsCount } = useMemo(() => {
    if (!product) return { itemsAvailable: 0, reviewsCount: 0 };
    
    return {
      itemsAvailable: Math.floor(Math.random() * 50) + 10,
      reviewsCount: Math.floor(Math.random() * 1000) + 100
    };
  }, [product]); // Only recalculate when product changes

  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const isWishlisted = product ? isInWishlist(product.id || product._id || '') : false;

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const allProducts = generateProducts(50);
      const foundProduct = allProducts.find(p => 
        p.seo?.slug === slug || p.id === slug
      ) || allProducts[0];
      
      if (foundProduct) {
        setProduct(foundProduct);
        setSelectedSize(foundProduct.sizes[0] || '');
        
        // Load related products
        const related = allProducts
          .filter(p => p.category === foundProduct.category && p.id !== foundProduct.id)
          .slice(0, 4);
        setRelatedProducts(related);
      }
      
      setIsLoading(false);
    };

    loadProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || !selectedSize) return;

    const cartItem = {
      productId: product.id || product._id || '',
      name: product.name,
      price: product.price,
      image: product.images?.[0] || product.image || '',
      size: selectedSize,
      quantity,
    };

    addItem(cartItem);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleWishlistToggle = () => {
    if (!product) return;

    if (isWishlisted) {
      removeFromWishlist(product.id || product._id || '');
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: product.id || product._id || '',
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image || '',
        category: product.category || '',
        rating: product.rating || 0,
      });
      showToast('Added to wishlist', 'success');
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Link to="/shop" className="btn-primary">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = isOnSale 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-4 text-sm text-gray-600">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span>/</span>
            <Link to="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link 
              to={`/category/${product.category}`}
              className="hover:text-gray-900 transition-colors capitalize"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
              <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
              <FallbackImage src={product.images && product.images[selectedImage] ? (typeof product.images[selectedImage] === 'string' ? product.images[selectedImage] : (product.images[selectedImage] as any).url) : primaryImage(product)} alt={product.name} className="w-full h-full object-cover" />
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === index
                        ? 'border-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FallbackImage
                      src={typeof image === 'string' ? image : (image as any).url}
                      alt={`${product.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                {product.category}
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-1 mb-3">
                {product.name}
              </h1>
              
              {/* Rating */}
                {(product.ratings?.count || 0) > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(product.ratings?.average || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {/* FIXED: Use stable reviewsCount from useMemo */}
                  <span className="text-gray-600">
                    {((product.ratings?.average ?? 0)).toFixed(1)} ({reviewsCount} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {isOnSale && (
                <>
                  <span className="text-xl text-gray-500 line-through">
                    {formatCurrency(product.originalPrice!)}
                  </span>
                  <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                    Save {discountPercentage}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-lg leading-relaxed">
              {product.description}
            </p>

            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="block text-sm font-medium text-gray-700">
                    Select Size
                  </p>
                  <Link 
                    to="/size-guide" 
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Size Guide
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 border-2 rounded-lg font-medium transition-all ${
                        selectedSize === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-3">
                Quantity
              </p>
              <div className="flex items-center gap-3 w-32">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-lg font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {/* FIXED: Use stable itemsAvailable from useMemo */}
              <p className="text-sm text-gray-500 mt-2">
                {itemsAvailable} items available
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || !selectedSize}
                className="flex-1 bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                Add to Cart - {formatCurrency(product.price * quantity)}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={handleWishlistToggle}
                  className={`w-14 h-14 flex items-center justify-center rounded-lg border transition-colors ${
                    isWishlisted
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-6 w-6 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={handleShare}
                  className="w-14 h-14 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <Share2 className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-600">Over Rs 2,000</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">2-Year Warranty</p>
                  <p className="text-sm text-gray-600">Quality Guarantee</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">In Stock</p>
                  <p className="text-sm text-gray-600">Ready to Ship</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            {product.specifications && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {product.specifications.material && (
                    <div>
                      <span className="text-gray-600">Material:</span>
                      <span className="ml-2 text-gray-900">{product.specifications.material}</span>
                    </div>
                  )}
                  {product.specifications.care && (
                    <div>
                      <span className="text-gray-600">Care:</span>
                      <span className="ml-2 text-gray-900">{product.specifications.care}</span>
                    </div>
                  )}
                  {product.specifications.fit && (
                    <div>
                      <span className="text-gray-600">Fit:</span>
                      <span className="ml-2 text-gray-900">{product.specifications.fit}</span>
                    </div>
                  )}
                  {product.specifications.origin && (
                    <div>
                      <span className="text-gray-600">Origin:</span>
                      <span className="ml-2 text-gray-900">{product.specifications.origin}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">You Might Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Link to={`/product/${product.seo?.slug || product.id}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                        <div className="aspect-square overflow-hidden">
                        <FallbackImage
                          src={product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as any).url) : primaryImage(product)}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-blue-600 font-bold text-lg">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
