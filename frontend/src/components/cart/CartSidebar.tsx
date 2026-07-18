// src/components/cart/CartSidebar.tsx
import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { Link } from "react-router-dom";

export default function CartSidebar() {
  const { items, subtotal, shipping, tax, total, removeItem, updateQuantity, getItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = getItemCount();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleRemoveItem = (productId: string, size: string, color?: string) => {
    removeItem(productId, size, color);
  };

  const handleUpdateQuantity = (productId: string, size: string, quantity: number, color?: string) => {
    if (quantity < 1) {
      handleRemoveItem(productId, size, color);
      return;
    }
    updateQuantity(productId, size, quantity, color);
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group -m-2 p-2 flex items-center ml-4"
        aria-label={`Shopping cart, ${totalItems} items`}
      >
        <svg className="flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {totalItems > 0 && <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-primary">{totalItems}</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            role="button"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(false);
              }
            }}
          />
          <div className="relative ml-auto w-full md:w-96 h-full bg-white shadow-xl z-50 flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Shopping Cart</h2>
              <button onClick={() => setIsOpen(false)} aria-label="Close cart" className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => {
                    const safeName = String(item.name ?? '');
                    const safeSize = String(item.size ?? '');
                    const safeImage = typeof item.image === 'string' ? item.image : (item.image && (item.image.url || item.image.src)) || 'https://via.placeholder.com/80';
                    const safePrice = Number(item.price) || 0;
                    const variantLabel = item.variantName || item.colorName || '';
                    const colorValue = item.variantHex || item.color || '';
                    const colorKey = variantLabel || colorValue || '';

                    return (
                      <div key={`${String(item.productId)}-${safeSize}-${colorKey}`} className="flex">
                        <img src={safeImage} alt={safeName} className="h-16 w-16 rounded object-cover" loading="lazy" />
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-gray-900">{safeName}</h3>
                            <button onClick={() => handleRemoveItem(String(item.productId), safeSize, colorValue || undefined)} className="text-gray-400 hover:text-gray-500" aria-label={`Remove ${safeName}`}>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-gray-500 text-sm">
                            <div>Size: <span className="font-medium text-gray-700">{safeSize || '—'}</span></div>
                            {(() => {
                              const label = variantLabel || colorValue;
                              if (!label) return null;
                              return (
                                <div className="mt-1 flex items-center gap-2">
                                  {colorValue ? (
                                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: String(colorValue) }} />
                                  ) : null}
                                  <span className="text-sm font-light text-gray-600">Color: <span className="font-medium text-gray-700 capitalize">{String(label)}</span></span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="mt-2 flex items-center">
                            <button className="border rounded-l px-2 py-1 text-gray-500 hover:bg-gray-100" onClick={() => handleUpdateQuantity(String(item.productId), safeSize, item.quantity - 1, colorValue || undefined)}>-</button>
                            <span className="border-t border-b px-3 py-1">{item.quantity}</span>
                            <button className="border rounded-r px-2 py-1 text-gray-500 hover:bg-gray-100" onClick={() => handleUpdateQuantity(String(item.productId), safeSize, item.quantity + 1, colorValue || undefined)}>+</button>
                            <p className="ml-4 font-medium">{formatCurrency(safePrice * item.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t p-6">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <p>Subtotal</p>
                    <p>{formatCurrency(subtotal)}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p>Shipping</p>
                    <p>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</p>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <p>Tax</p>
                      <p>{formatCurrency(tax)}</p>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-medium text-gray-900 border-t pt-2">
                    <p>Total</p>
                    <p>{formatCurrency(total)}</p>
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm mb-4">Shipping and taxes calculated at checkout.</p>

                <Link to="/checkout" onClick={() => setIsOpen(false)} className="w-full bg-black text-white py-3 rounded-md text-center font-medium block">
                  Checkout
                </Link>

                <button onClick={() => setIsOpen(false)} className="mt-2 w-full bg-white border border-gray-300 rounded-md py-3 text-base font-medium text-gray-700">
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
