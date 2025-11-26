// src/components/layout/SearchOverlay.tsx
import { useEffect, useRef } from "react";
import { X, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/formatCurrency";
import { productId, primaryImage, priceNumber } from '../../utils/productHelpers';
import FallbackImage from "../ui/FallbackImage";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  suggestions: Product[];
  onSearch: (value: string) => void;
  onSuggestionClick: (product: Product) => void;
  // optional prop allows parent to override wishlist toggle behavior
  handleToggleWishlist?: (product: Product) => void;
};

export default function SearchOverlay({
  isOpen,
  onClose,
  suggestions,
  onSearch,
  onSuggestionClick,
  handleToggleWishlist: parentToggleWishlist,
}: Props) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  // Use the public cart API from CartContext (addItem) instead of trying to access a dispatch
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // use parent-provided wishlist toggle if available, otherwise use local implementation
  const handleToggleWishlist = (product: Product) => {
    if (typeof parentToggleWishlist === "function") {
      parentToggleWishlist(product);
      return;
    }

    const pid = productId(product);
    if (isInWishlist(pid)) {
      removeFromWishlist(pid);
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: priceNumber(product),
        image: primaryImage(product),
        category: product.category ?? '',
        // rating may not exist on Product type in some mocks
        rating: (product as any).rating || 4.5 // fallback rating
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-20">
      <div ref={overlayRef} className="bg-white w-full max-w-xl rounded shadow-lg p-4 mx-4 relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-gray-600 hover:text-black">
          <X className="h-5 w-5" />
        </button>

        <input
          type="text"
          placeholder="Search for products..."
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate("/shop");
              onClose();
            }
          }}
        />

        {suggestions.length > 0 && (
          <div className="mt-3 border rounded bg-white shadow divide-y max-h-80 overflow-y-auto">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition">
                <button
                  onClick={() => onSuggestionClick(s)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <FallbackImage src={primaryImage(s)} alt={s.name} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(priceNumber(s))}</p>
                  </div>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist(s);
                    }}
                    className={`p-2 rounded-full border hover:bg-gray-100 ${
                      isInWishlist(productId(s)) ? "text-red-500 bg-red-50" : "text-gray-500"
                    }`}
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`h-5 w-5 ${isInWishlist(productId(s)) ? "fill-current" : ""}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // addItem expects a CartItem shape: { productId, name, price, image, size, quantity }
                      addItem({
                        productId: productId(s),
                        name: s.name,
                        price: priceNumber(s),
                        image: primaryImage(s),
                        size: (s.sizes && s.sizes.length > 0) ? s.sizes[0] : 'M',
                        quantity: 1,
                      });
                      // give user feedback
                      showToast?.("Added to cart", "success");
                    }}
                    className="p-2 rounded-full border hover:bg-gray-100"
                    aria-label="Add to cart"
                  >
                    🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}