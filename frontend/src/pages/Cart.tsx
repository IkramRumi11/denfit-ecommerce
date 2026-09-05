// src/pages/Cart.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useShipping } from '../context/ShippingContext';
import { TAX_FEATURE } from '../config/taxFeatureFlag';
import { useToast } from '../context/ToastContext';
import { getColorName } from '../utils/colorNames';
import { getAvailableStockForItem } from '../utils/stockHelpers';
import { productsAPI } from '../api';

export const Cart: React.FC = () => {
  const { items, subtotal, shipping, tax, total, removeItem, updateQuantity, clearCart } = useCart();
  const { freeShippingText } = useShipping();
  const { showToast } = useToast();

  const [productStocks, setProductStocks] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchStocks = async () => {
      const uniqueProductIds = Array.from(new Set(items.map(it => it.productId).filter(Boolean)));
      if (!uniqueProductIds.length) return;
      try {
        const results = await Promise.all(
          uniqueProductIds.map(id => productsAPI.getById(id).catch(() => null))
        );
        const stocks: Record<string, any> = {};
        results.forEach((res: any) => {
          const prod = res && (res.product || res.data?.product || res);
          if (prod) {
            stocks[String(prod._id || prod.id)] = prod;
            if (prod._id) stocks[String(prod._id)] = prod;
            if (prod.id) stocks[String(prod.id)] = prod;
          }
        });
        setProductStocks(stocks);
      } catch (e) {
        console.error('Failed to batch load cart stocks:', e);
      }
    };
    fetchStocks();
  }, [items.map(it => it.productId).sort().join(',')]);

  const getCartItemStock = (item: any): number => {
    const prod = productStocks[String(item.productId)] || productStocks[String(item.id)];
    if (!prod) return 999; // Fallback during load

    return getAvailableStockForItem(prod, {
      size: item.size,
      color: item.color,
      colorName: item.colorName,
      variantId: item.variantId,
      variantName: item.variantName,
      variantHex: item.variantHex
    });
  };

  const handleQuantityChange = (item: any, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item.productId, item.size, item.color);
      showToast('Item removed from cart', 'info');
      return;
    }

    const availableStock = getCartItemStock(item);
    if (availableStock !== 999 && newQuantity > availableStock) {
      showToast(`Only ${availableStock} available for this option.`, 'error');
      return;
    }

    updateQuantity(item.productId, item.size, newQuantity, item.color);
  };

  const handleRemoveItem = (productId: string, size: string, color?: string) => {
    removeItem(productId, size, color);
    showToast('Item removed from cart', 'info');
  };

  const handleClearCart = () => {
    clearCart();
    showToast('Cart cleared', 'info');
  };

  const overStockItems = items.filter(it => {
    const stock = getCartItemStock(it);
    return stock !== 999 && it.quantity > stock;
  });

  const handleFixAllOverStock = () => {
    items.forEach(it => {
      const stock = getCartItemStock(it);
      if (stock !== 999 && it.quantity > stock) {
        if (stock <= 0) {
          removeItem(it.productId, it.size, it.color);
        } else {
          updateQuantity(it.productId, it.size, stock, it.color, stock);
        }
      }
    });
    showToast('Cart quantities synchronized with available inventory', 'success');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[75vh] bg-neutral-50/50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full mx-auto text-center bg-white border border-neutral-200/80 rounded-2xl p-8 sm:p-12 shadow-sm">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-400">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            Cart Is Empty
          </span>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-900 mb-3">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
            Looks like you haven't added anything yet. Explore our latest arrivals, wardrobe essentials, and exclusive seasonal releases.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              to="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-all shadow-sm group"
            >
              <span>Explore Collection / Shop Now</span>
              <ArrowRight className="ml-2.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="pt-8 border-t border-neutral-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
              Explore Popular Categories
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/men"
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
              >
                Men's Collection
              </Link>
              <Link
                to="/women"
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
              >
                Women's Collection
              </Link>
              <Link
                to="/kids"
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
              >
                Kids
              </Link>
              <Link
                to="/sale"
                className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors"
              >
                Sale &amp; Offers %
              </Link>
              <Link
                to="/accessories"
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
              >
                Accessories
              </Link>
              <Link
                to="/fragrances"
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
              >
                Fragrances
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100 grid grid-cols-2 gap-4 text-left">
            <div className="flex items-center text-xs text-neutral-500">
              <Truck className="h-4 w-4 mr-2 text-amber-600 shrink-0" />
              <span>{freeShippingText}</span>
            </div>
            <div className="flex items-center text-xs text-neutral-500">
              <ShieldCheck className="h-4 w-4 mr-2 text-amber-600 shrink-0" />
              <span>14-day hassle-free exchange</span>
            </div>
          </div>
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

        {overStockItems.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Inventory Notice</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Some items in your cart exceed currently available inventory.
              </p>
            </div>
            <button
              onClick={handleFixAllOverStock}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
            >
              Update to Available Stock
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm">
              {items.map((item, index) => {
                const availableStock = getCartItemStock(item);
                const isMaxReached = availableStock !== 999 && item.quantity >= availableStock;
                const isOverStock = availableStock !== 999 && item.quantity > availableStock;
                const isItemOutOfStock = availableStock !== 999 && availableStock <= 0;

                return (
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
                      {(item.brand || (item.product && item.product.brand)) && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                          {item.brand || (item.product && item.product.brand)}
                        </p>
                      )}
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {item.name}
                      </h3>
                      <div className="text-gray-600 text-sm mb-1">
                        <div>{/ml$/i.test(String(item.size || '').trim()) ? 'Volume:' : 'Size:'} <span className="font-medium text-gray-700">{item.size || '—'}</span></div>
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

                      {isItemOutOfStock ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            Out of stock
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.productId, item.size, item.color)}
                            className="text-xs text-red-600 underline font-medium hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ) : isOverStock ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Only {availableStock} available
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, availableStock)}
                            className="text-xs text-blue-600 underline font-semibold hover:text-blue-800"
                          >
                            Adjust to {availableStock}
                          </button>
                        </div>
                      ) : null}

                      <p className="text-lg font-bold text-blue-600 mt-1">
                        Rs {item.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-4 py-2 min-w-12 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={isMaxReached}
                            title={isMaxReached ? `Only ${availableStock} available` : 'Increase quantity'}
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

                      {/* Small stock warning tag when reaching maximum available quantity */}
                      {!isOverStock && isMaxReached && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          Only {availableStock} available
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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

              {overStockItems.length > 0 ? (
                <button
                  onClick={handleFixAllOverStock}
                  className="w-full bg-amber-700 text-white py-3 rounded-lg font-medium hover:bg-amber-800 transition-colors text-center block"
                >
                  Adjust to Available & Proceed
                </button>
              ) : (
                <Link
                  to="/checkout"
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block"
                >
                  Proceed to Checkout
                </Link>
              )}

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
