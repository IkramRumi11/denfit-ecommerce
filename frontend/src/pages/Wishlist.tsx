import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatCurrency';

export const Wishlist: React.FC = () => {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const { showToast } = useToast();

  // Safe array access
  const safeItems = Array.isArray(items) ? items : [];

  const addToCart = (product: any) => {
    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: 'M',
        quantity: 1
      });
      showToast('Added to cart!', 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleRemoveFromWishlist = (productId: string) => {
    removeFromWishlist(productId);
    showToast('Removed from wishlist', 'info');
  };

  const handleClearWishlist = () => {
    clearWishlist();
    showToast('Wishlist cleared', 'info');
  };

  if (safeItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center bg-white rounded-2xl shadow-sm p-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h1>
            <p className="text-gray-600 mb-8">
              Save items you love to your wishlist. Review them anytime and easily move them to your cart.
            </p>
            <Link
              to="/shop"
              className="btn-primary"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-2">
              {safeItems.length} {safeItems.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          {safeItems.length > 0 && (
            <button
              onClick={handleClearWishlist}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {safeItems.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => handleRemoveFromWishlist(product.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-blue-600 mb-4">
                  {formatCurrency(product.price)}
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  
                  <Link
                    to={`/product/${product.id}`}
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        {safeItems.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  safeItems.forEach(product => addToCart(product));
                  showToast('All items added to cart!', 'success');
                }}
                className="flex items-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <ShoppingCart className="h-5 w-5" />
                Add All to Cart
              </button>
              
              <Link
                to="/shop"
                className="flex items-center gap-2 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Continue Shopping
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
