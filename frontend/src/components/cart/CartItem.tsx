// src/components/cart/CartItem.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

interface CartItemProps {
  item: {
    productId: string;
    name: string;
    price: number;
    image: string;
    size: string;
    quantity: number;
  };
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { removeItem, updateQuantity } = useCart();
  const { showToast } = useToast();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item.productId, item.size);
      showToast('Item removed from cart', 'info');
    } else {
      updateQuantity(item.productId, item.size, newQuantity);
    }
  };

  const handleRemove = () => {
    removeItem(item.productId, item.size);
    showToast('Item removed from cart', 'info');
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-b-0">
      <Link to={`/product/${item.productId}`} className="flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-lg"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>' }}
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <Link 
          to={`/product/${item.productId}`}
          className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {item.name}
        </Link>
        <p className="text-gray-500 text-sm mt-1">Size: {item.size}</p>
        <p className="text-lg font-bold text-blue-600 mt-1">
          Rs {item.price.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quantity Controls */}
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
            disabled={item.quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-4 py-2 min-w-12 text-center font-medium">
            {item.quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Total Price */}
        <div className="text-right min-w-20">
          <p className="font-bold text-gray-900">
            Rs {(item.price * item.quantity).toLocaleString()}
          </p>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemove}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
