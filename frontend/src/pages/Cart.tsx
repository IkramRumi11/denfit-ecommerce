// src/pages/Cart.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { TAX_FEATURE } from '../config/taxFeatureFlag';
import { useToast } from '../context/ToastContext';
import { getColorName } from '../utils/colorNames';
import { productsAPI } from '../api';

export const Cart: React.FC = () => {
  const { items, subtotal, shipping, tax, total, removeItem, updateQuantity, clearCart } = useCart();
  const { showToast } = useToast();

  const [productStocks, setProductStocks] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchStocks = async () => {
      const uniqueProductIds = Array.from(new Set(items.map(it => it.productId)));
      if (!uniqueProductIds.length) return;
      try {
        const results = await Promise.all(
          uniqueProductIds.map(id => productsAPI.getById(id))
        );
        const stocks: Record<string, any> = {};
        results.forEach(res => {
          const prod = res && (res.product || (res as any).data?.product || res);
          if (prod) {
            stocks[String(prod._id || prod.id)] = prod;
          }
        });
        setProductStocks(stocks);
      } catch (e) {
        console.error('Failed to batch load cart stocks:', e);
      }
    };
    fetchStocks();
  }, [items.length]);

  const getCartItemStock = (item: any): number => {
    const prod = productStocks[item.productId];
    if (!prod) return 999; // Fallback during load

    if (Array.isArray(prod.stock) && prod.stock.length) {
      const match = prod.stock.find((s: any) => {
        if (!s) return false;
        const matchesColor = item.variantId
          ? String(s.colorTempId) === String(item.variantId)
          : (item.color ? String(s.colorTempId).toLowerCase().trim() === String(item.color).toLowerCase().trim() : true);
        
        let displaySize = s.sizeId;
        if (Array.isArray(prod.sizes) && prod.sizes.length) {
          const found = prod.sizes.find((sz: any) => sz.id === s.sizeId || sz.value === s.sizeId);
          if (found) displaySize = found.value || found.id;
        }
        const matchesSize = String(displaySize).toLowerCase().trim() === String(item.size).toLowerCase().trim();
        return matchesColor && matchesSize;
      });
      if (match && typeof match.quantity === 'number') return match.quantity;
      return 0;
    }

    if (item.variantId && Array.isArray(prod.variants)) {
      const matchedVar = prod.variants.find((v: any) => String(v._id || v.id) === String(item.variantId));
      if (matchedVar && typeof matchedVar.inventory === 'number') return matchedVar.inventory;
    }

    if (typeof prod.inventory === 'number') return prod.inventory;

    return 0;
  };

  const handleQuantityChange = (productId: string, size: string, newQuantity: number, color?: string) => {
    const item = items.find(it => it.productId === productId && it.size === size && it.color === color);
    if (!item) return;

    if (newQuantity < 1) {
      removeItem(productId, size, color);
      showToast('Item removed from cart', 'info');
    } else {
      const availableStock = getCartItemStock(item);
      if (newQuantity > availableStock) {
        showToast(`Only ${availableStock} items are available for this variant. Please reduce the quantity.`, 'error');
        return;
      }
      updateQuantity(productId, size, newQuantity, color);
    }
  };

  const handleRemoveItem = (productId: string, size: string, color?: string) => {
    removeItem(productId, size, color);
    showToast('Item removed from cart', 'info');
  };

  const handleClearCart = () => {
    clearCart();
    showToast('Cart cleared', 'info');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <button
            onClick={handleClearCart}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm">
              {items.map((item, index) => (
                <motion.div
                  key={`${item.productId}-${item.size}-${item.colorName || item.color || ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-6 border-b border-gray-100 last:border-b-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {item.name}
                    </h3>
                    <div className="text-gray-600 text-sm mb-1">
                      <div>Size: <span className="font-medium text-gray-700">{item.size || '—'}</span></div>
                      {(() => {
                        const variantLabel = item.variantName || item.colorName || '';
                        const colorValue = item.variantHex || item.color || '';
                        const label = variantLabel || colorValue;
                        if (!label) return null;
                        const friendlyName = getColorName(label);
                        return (
                          <div className="mt-1 flex items-center gap-2">
                            {colorValue ? (
                              <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: String(colorValue) }} />
                            ) : null}
                            <span className="text-sm font-light text-gray-600">Color: <span className="font-medium text-gray-700 capitalize">{friendlyName}</span></span>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      Rs {item.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.size, item.quantity - 1, item.color)}
                        className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 min-w-12 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.size, item.quantity + 1, item.color)}
                        className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item.productId, item.size, item.color)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">Rs {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? 'Free' : `Rs ${shipping.toLocaleString()}`}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">Rs {tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>Rs {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block"
              >
                Proceed to Checkout
              </Link>

              <Link
                to="/shop"
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block mt-3"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
