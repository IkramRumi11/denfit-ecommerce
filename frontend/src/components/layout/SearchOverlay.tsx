// src/components/layout/SearchOverlay.tsx
import { useEffect, useRef, useState } from "react";
import { X, Heart, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { productsAPI } from '../../api';
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/formatCurrency";
import { productId, primaryImage, priceNumber, canonicalProductId, resolveProductSelection } from '../../utils/productHelpers';
import { isOutOfStock, getAvailableStockForItem } from '../../utils/stockHelpers';
import FallbackImage from "../ui/FallbackImage";
import { QuickViewModal } from '../QuickViewModal';

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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [quickAddProduct, setQuickAddProduct] = useState<any | null>(null);
  const [results, setResults] = useState<Product[]>([]);

  const openQuickAdd = (product: any) => setQuickAddProduct(product);
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
        price: priceNumber(product),
        image: primaryImage({ ...product, selectedVariantId: selection.variantId } as any),
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
          showToast?.(`You already have all ${availableStock} available units in your cart`, 'warning');
        } else {
          showToast?.('Product is out of stock', 'error');
        }
        return;
      }

      showToast?.(`${product.name} added to the cart`, 'success');
      closeQuickAdd();
    } catch (err) {
      console.error('Error adding to cart from layout search overlay', err);
      showToast?.('Failed to add to cart', 'error');
    }
  };

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

  // Fetch live results when query changes
  useEffect(() => {
    if (!query || !query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    const id = setTimeout(async () => {
      try {
        const res: any = await productsAPI.getAll({ search: query.trim(), limit: 6 });
        const products = res && res.products ? res.products : (res?.data?.products || []);
        if (!active) return;
        setResults(Array.isArray(products) ? products : []);
      } catch (err) {
        console.error('layout search failed', err);
        showToast?.('Search failed', 'error');
      }
    }, 220);

    return () => { active = false; clearTimeout(id); };
  }, [query]);

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
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            try { onSearch(v); } catch (e) {}
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const q = query && query.trim() ? `?search=${encodeURIComponent(query.trim())}` : '';
              navigate(`/shop${q}`);
              onClose();
            }
          }}
        />

        {(
          (Array.isArray(suggestions) && suggestions.length > 0) || (Array.isArray(results) && results.length > 0)
        ) ? (
          <div className="mt-3 border rounded bg-white shadow divide-y max-h-80 overflow-y-auto">
            {(Array.isArray(results) && results.length > 0 ? results : suggestions).map((s, i) => (
              <div key={productId(s) || `search-${i}`} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition">
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
                    onClick={(e) => { e.stopPropagation(); openQuickAdd(s); }}
                    className="p-2 rounded-full border hover:bg-gray-100"
                    aria-label="Add to cart"
                  >
                    🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim().length >= 2 ? (
          <div className="mt-3 p-6 text-center border rounded-xl bg-white shadow-sm">
            <Search className="h-7 w-7 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-800">No related products available</p>
            <p className="text-xs text-gray-500 mt-1">Try a different search or check the spelling.</p>
          </div>
        ) : null}

        {quickAddProduct && (
          <QuickViewModal
            product={quickAddProduct}
            isOpen={!!quickAddProduct}
            onClose={closeQuickAdd}
            onAddToCart={(size: string, color?: string) => performAddToCart(quickAddProduct, size, color)}
          />
        )}
      </div>
    </div>
  );
}