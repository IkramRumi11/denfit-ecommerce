import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatCurrency';
import { primaryImage, canonicalProductId, resolveProductSelection } from '../utils/productHelpers';
import { getAvailableStockForItem } from '../utils/stockHelpers';
import { QuickViewModal } from '../components/QuickViewModal';
import { productsAPI } from '../api';

export const Wishlist: React.FC = () => {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [quickAddProduct, setQuickAddProduct] = React.useState<any | null>(null);

  const openQuickAdd = async (product: any) => {
    if (!product) return;
    try {
      // Try to fetch full product details when opening quick-add from wishlist
      const res: any = await productsAPI.getById(String(product.id || product._id || product));
      let p = res && (res.product || res.data?.product) ? (res.product || res.data?.product) : (res || res.data || null);
      if (!p) {
        // fallback to the lightweight object from wishlist
        p = product;
      }
      setQuickAddProduct(p);
    } catch (err) {
      setQuickAddProduct(product);
    }
  };

  const closeQuickAdd = () => setQuickAddProduct(null);

  const performAddToCart = (product: any, size: string, color?: string) => {
    try {
      const selection = resolveProductSelection(product, { size, color });
      const availableStock = getAvailableStockForItem(product, {
        size: selection.size,
        color: selection.color,
        colorName: selection.colorName,
        variantId: selection.variantId,
        variantName: selection.variantName,
        variantHex: selection.variantHex
      });

      const res = addItem({
        productId: canonicalProductId(product),
        name: product.name,
        price: product.price,
        image: primaryImage({ ...product, selectedVariantId: selection.variantId } as any) || ((typeof product.image === 'string' && product.image) ? product.image : ''),
        size: selection.size,
        color: selection.color,
        colorName: selection.colorName,
        variantId: selection.variantId,
        variantName: selection.variantName,
        variantHex: selection.variantHex,
        variantImage: selection.variantImage,
        quantity: 1,
        maxStock: availableStock
      }, availableStock);

      if (!res.success) {
        if (res.reason === 'MAX_REACHED') {
          showToast(`You already have all ${availableStock} available units in your cart`, 'warning');
        } else {
          showToast('Product is out of stock', 'error');
        }
        return;
      }

      showToast(`${product.name} added to the cart`, 'success');
      // Remove from wishlist after successful add-to-cart
      try { removeFromWishlist(product.id); } catch (e) { /* ignore */ }
      closeQuickAdd();
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  // Safe array access
  const safeItems = Array.isArray(items) ? items : [];

  const addToCart = (product: any) => {
    // Open quick-add modal so user can select size/color instead of defaulting to 'M'
    openQuickAdd(product);
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
      <div className="min-h-screen bg-white py-8">
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
    <div className="min-h-screen bg-white py-8">
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
                  src={product.image || primaryImage(product)}
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
                  {product?.outOfStock && (
                    <div className="inline-block mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">Out of Stock</span>
                    </div>
                  )}
                <p className="text-lg font-bold text-blue-600 mb-4">
                  {formatCurrency(product.price)}
                </p>

                <div className="space-y-2">
                  {product?.outOfStock ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-gray-300 text-white py-2 px-4 rounded-lg cursor-not-allowed font-medium"
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => openQuickAdd(product)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                  )}
                  
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
                  // Require explicit selection for each item; open quick-add for the first item
                  if (safeItems.length > 0) {
                    openQuickAdd(safeItems[0]);
                    showToast('Open each item and select size/color before adding to cart', 'info');
                  }
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
      {/* Quick-add modal for wishlist */}
      {quickAddProduct && (
        <QuickViewModal
          product={quickAddProduct}
          isOpen={!!quickAddProduct}
          onClose={closeQuickAdd}
          onAddToCart={(size: string, color?: string) => performAddToCart(quickAddProduct, size, color)}
        />
      )}
    </div>
  );
};

export default Wishlist;
