// src/components/layout/SearchOverlay.tsx
import { useEffect, useRef, useState } from "react";
import { X, Heart, Search, Flame } from "lucide-react";
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
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);

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

  // Fetch trending products when opened
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    productsAPI.getAll({ trending: true, limit: 4 })
      .then((res: any) => {
        const prods = (res && (res.products || res.data?.products)) || [];
        if (active) {
          if (Array.isArray(prods) && prods.length > 0) {
            setTrendingProducts(prods.slice(0, 4));
          } else {
            // Fallback: load first 4 products
            productsAPI.getAll({ limit: 4 }).then((fRes: any) => {
              const fallbackProds = (fRes && (fRes.products || fRes.data?.products)) || [];
              if (active) setTrendingProducts(fallbackProds.slice(0, 4));
            }).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load trending products for search overlay', err);
      });

    return () => { active = false; };
  }, [isOpen]);

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
        rating: (product as any).rating || 4.5
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

  const displayList = Array.isArray(results) && results.length > 0 ? results : suggestions;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-20">
      <div ref={overlayRef} className="bg-white w-full max-w-xl rounded-xl shadow-2xl p-5 mx-4 relative">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products, brands (e.g. Nike, Hoodie)..."
              className="w-full pl-11 pr-14 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              value={query}
              autoFocus
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
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-medium px-1 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Close search"
            title="Close search (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Empty state / Trending Products suggestion section before typing */}
        {!query.trim() && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-700">
              <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
              <span>Trending Now</span>
            </div>
            {trendingProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trendingProducts.slice(0, 4).map((tp) => (
                  <button
                    key={productId(tp)}
                    onClick={() => onSuggestionClick(tp)}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition text-left group"
                  >
                    <FallbackImage
                      src={primaryImage(tp)}
                      alt={tp.name}
                      className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      {tp.brand && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block truncate">
                          {tp.brand}
                        </span>
                      )}
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {tp.name}
                      </p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">
                        {formatCurrency(priceNumber(tp))}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-1">Popular suggestions will appear here.</p>
            )}
          </div>
        )}

        {/* Active Search Results list */}
        {query.trim() && displayList && displayList.length > 0 && (
          <div className="mt-3 border border-gray-100 rounded-lg bg-white shadow-sm divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {displayList.map((s, i) => (
              <div key={productId(s) || `search-${i}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition">
                <button
                  onClick={() => onSuggestionClick(s)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <FallbackImage
                    src={primaryImage(s)}
                    alt={s.name}
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    {s.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block truncate">
                        {s.brand}
                      </span>
                    )}
                    <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 font-semibold">{formatCurrency(priceNumber(s))}</p>
                  </div>
                </button>

                <div className="flex gap-1.5 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist(s);
                    }}
                    className={`p-2 rounded-full border hover:bg-gray-100 transition ${
                      isInWishlist(productId(s)) ? "text-red-500 bg-red-50 border-red-200" : "text-gray-500 border-gray-200"
                    }`}
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(productId(s)) ? "fill-current" : ""}`} />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); openQuickAdd(s); }}
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition text-sm"
                    aria-label="Add to cart"
                  >
                    🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {query.trim().length >= 2 && (!displayList || displayList.length === 0) && (
          <div className="mt-3 p-6 text-center border border-gray-100 rounded-xl bg-gray-50 shadow-sm">
            <Search className="h-7 w-7 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-800">No related products available</p>
            <p className="text-xs text-gray-500 mt-1">Try searching for a different product or brand name.</p>
          </div>
        )}

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