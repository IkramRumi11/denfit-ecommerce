// src/components/features/ProductCard.tsx
import React from "react";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/formatCurrency";
import FallbackImage from "../ui/FallbackImage";

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isInWishlist: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onView,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  return (
    <div className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Product Image */}
      <div className="relative overflow-hidden">
        <FallbackImage
          src={product.image}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => onToggleWishlist(product)}
            className={`p-2 rounded-full backdrop-blur-sm ${
              isInWishlist 
                ? "bg-red-500 text-white" 
                : "bg-white/80 text-gray-700 hover:bg-white"
            } transition-colors`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? "fill-current" : ""}`} />
          </button>
          
          <button
            onClick={() => onView(product)}
            className="p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Add to Cart */}
        <button
          onClick={() => onAddToCart(product)}
          className="absolute bottom-3 left-3 right-3 bg-black text-white py-2 px-4 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-800"
        >
          <ShoppingBag className="h-4 w-4 inline mr-1" />
          Add to Cart
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 capitalize mb-2">
          {product.category}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          <div className="flex gap-1">
            {product.sizes.slice(0, 3).map((size: string) => (
              <span
                key={size}
                className="text-xs bg-gray-100 px-2 py-1 rounded"
              >
                {size}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
