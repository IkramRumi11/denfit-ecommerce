// src/components/ProductCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Eye, ShoppingCart, Plus, X } from 'lucide-react';
import FallbackImage from './ui/FallbackImage';
import { useProductVariant } from '../hooks/useProductVariant';
import useReducedMotion from '../hooks/useReducedMotion';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { QuickViewModal } from './QuickViewModal';
import type { Product } from '../types';
import { productId, primaryImage, priceNumber } from '../utils/productHelpers';
import { getCategoryGroup, getDisplaySizesForProduct, getAvailableSizesForProduct } from '../utils/sizeRules';
import { getAvailableQuantity, isOutOfStock, isLowStock } from '../utils/stockHelpers';
import { getColorName } from '../utils/colorNames';

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (size: string, color?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { addItem } = useCart();
  const navigate = useNavigate();

  // State
  const [showMobileQuickAdd, setShowMobileQuickAdd] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const { selectedVariantId, setSelectedVariantId } = useProductVariant(productId(product));
  const [showQuickView, setShowQuickView] = useState(false);

  // Derived data
  const categoryGroup = getCategoryGroup(product.category, product.subcategory);
  const allSizes = getDisplaySizesForProduct(product as any);
  const selectedVariant = (product as any).variants && Array.isArray((product as any).variants) && (selectedVariantId)
    ? (product as any).variants.find((v: any) => String(v._id || v.id) === String(selectedVariantId))
    : undefined;
  const available = getAvailableSizesForProduct(product as any, selectedVariant);

  const isWishlisted =
    typeof isInWishlist === 'function' ? isInWishlist(productId(product)) : false;

  const price = priceNumber(product);
  const originalPrice = (product as any).originalPrice || (product as any).compareAtPrice;
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const displayRating: number | null =
    typeof (product as any).rating === 'number'
      ? (product as any).rating
      : (product as any).ratings && typeof (product as any).ratings.average === 'number'
      ? (product as any).ratings.average
      : null;

  const reviewCount: number =
    (product as any).reviewCount ??
    (product as any).reviewsCount ??
    (product as any).ratings?.count ??
    0;

  const normalizeTagsForDisplay = (input: any): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(String).map(s => s.trim()).filter(Boolean);
    if (typeof input === 'string') {
      let s = input.trim();
      try {
        for (let i = 0; i < 5; i++) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.flatMap((x:any) => typeof x === 'string' ? x : String(x)).map(String).map(s=>s.trim()).filter(Boolean);
          if (typeof parsed === 'string') { s = parsed; continue; }
          return [String(parsed)];
        }
      } catch (e) {}
      if (s.includes(',')) return s.split(',').map((x:string) => x.trim()).filter(Boolean);
      return [s.replace(/^['`\"]+|['`\"]+$/g, '').trim()].filter(Boolean);
    }
    return [String(input)];
  };

  // Check if product has colors/variants
  const hasColors = 
    (product.variants && Array.isArray(product.variants) && product.variants.length > 0) ||
    (product.colors && Array.isArray(product.colors) && product.colors.length > 0);

  // Handlers
  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!selectedSize) {
      showToast('Please select a size', 'error');
      return;
    }

    if (!available.includes(selectedSize)) {
      showToast('Selected size is not available', 'error');
      return;
    }

    if (hasColors && !selectedVariantId && !selectedColor) {
      showToast('Please select a color', 'error');
      return;
    }


    const performAdd = (size: string, color?: string, variantId?: string) => {
      // If parent provided an onAddToCart handler but we're in the mobile quick-add
      // sheet, perform internal add to avoid delegating to parent which may open
      // the QuickView modal (Shop passes an onAddToCart that opens quick-add).
      if (onAddToCart && !showMobileQuickAdd) {
        onAddToCart(size, color);
        return;
      }

      if (onAddToCart && showMobileQuickAdd) {
        // When mobile quick-add is used, prefer internal add to avoid reopening QuickView
        // fall through to internal add implementation below
      }

      // Internal add path
      try {
        const imageSrc = primaryImage(product) || '';
        const price = priceNumber(product);
        // Resolve variant snapshot (allow color argument to be hex/name or variant id)
        let variantSnapshot: any = undefined;
        if (product?.variants) {
          variantSnapshot = (product as any).variants.find((v: any) => {
            if (!color && !variantId) return false;
            const key = String(color || variantId || '').toLowerCase();
            return String(v._id || v.id || '').toLowerCase() === key || String(v.hex || v.normalizedHex || v.value || '').toLowerCase() === key || String(v.name || '').toLowerCase() === key;
          });
        }

        const colorNormalized = variantSnapshot ? (variantSnapshot.hex || variantSnapshot.name) : (color || undefined);

        addItem({
          productId: product._id ?? product.id ?? '',
          name: String(product.name),
          price,
          image: imageSrc,
          size,
          color: colorNormalized,
          colorName: variantSnapshot?.name || selectedColorName || undefined,
          variantId: variantSnapshot?.id || variantId || undefined,
          variantName: variantSnapshot?.name || undefined,
          variantHex: variantSnapshot?.hex || undefined,
          quantity: 1,
        });
        showToast(`${String(product.name)} has been added to the cart`, 'success');
      } catch (err) {
        console.error('Error adding to cart:', err);
        showToast('Failed to add to cart', 'error');
      }
    };

    performAdd(selectedSize, selectedColor || undefined, selectedVariantId || undefined);
    setShowMobileQuickAdd(false);
  };

  const handleMobilePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock(product)) return;
    // Pre-select first available size if none selected (for the modal),
    // but always open the quick-add modal and require explicit confirm.
    if (!selectedSize && available.length > 0) {
      const first = available[0];
      setSelectedSize(first);
    }

    setShowMobileQuickAdd(true);
  };

  // Lock body scroll while mobile quick-add is open
  useEffect(() => {
    if (!showMobileQuickAdd) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow || '';
      body.style.paddingRight = prevPaddingRight || '';
    };
  }, [showMobileQuickAdd]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      removeFromWishlist(productId(product));
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: productId(product),
        name: product.name,
        price: priceNumber(product),
        image: primaryImage(product),
        category: product.category ?? '',
        rating: (product as any).rating,
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  const handleViewDetails = () => {
    navigate(`/product/${productId(product)}`);
  };

  // Hover preview
  const imgWrapperRef = useRef<HTMLDivElement | null>(null);
  const [previewStyle, setPreviewStyle] = useState<{ transform?: string }>({});
  const [hoveredSrc, setHoveredSrc] = useState<string | null>(null);
  const { reducedMotion } = useReducedMotion();
  const MICRO_PREVIEW_SCALE = 1.03;

  const handleCardMouseEnter = () => {
    if (!reducedMotion) setPreviewStyle({ transform: `scale(${MICRO_PREVIEW_SCALE})` });
    // Swap to the product's secondary main image (images[1]) on desktop hover only.
    try {
      if (typeof window !== 'undefined' && !('ontouchstart' in window)) {
        const imgs = Array.isArray((product as any).images)
          ? (product as any).images.map((i: any) => (typeof i === 'string' ? i : i.url)).filter(Boolean)
          : [];
        const primary = primaryImage({ ...product, selectedVariantId });
        const secondary = imgs.length > 1 ? imgs[1] : undefined; // strictly the second main image
        if (secondary && secondary !== primary) {
          const img = new Image();
          img.src = secondary; // preload
          setHoveredSrc(secondary);
        }
      }
    } catch (e) {
      // ignore errors
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    const el = imgWrapperRef.current;
    if (!el || reducedMotion) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width - 0.5;
    const ry = (e.clientY - rect.top) / rect.height - 0.5;
    setPreviewStyle({
      transform: `scale(${MICRO_PREVIEW_SCALE}) translate(${-rx * 8}px, ${-ry * 6}px)`,
    });
    // Keep hovered image positioned under cursor by adjusting translate slightly — anchored by preview transform above
  };

  const handleCardMouseLeave = () => {
    setPreviewStyle({ transform: 'scale(1)' });
    setHoveredSrc(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex flex-col bg-white rounded-none sm:rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-transparent hover:border-gray-100"
      >
        {/* IMAGE */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <button
            type="button"
            className="w-full h-full cursor-pointer focus:outline-none"
            onClick={handleViewDetails}
            onMouseEnter={handleCardMouseEnter}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            onFocus={handleCardMouseEnter}
            onBlur={handleCardMouseLeave}
          >
            <div ref={imgWrapperRef} className="w-full h-full overflow-hidden">
              <FallbackImage
                src={hoveredSrc || primaryImage({ ...product, selectedVariantId })}
                alt={String(product.name)}
                className="w-full h-full object-cover transition-transform duration-500 ease-out"
                style={previewStyle}
              />
            </div>
          </button>

          {/* BADGES */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            {isOutOfStock(product) && (
              <span className="bg-gray-900 text-white text-[10px] font-semibold uppercase px-2 py-1 tracking-wider">
                Sold Out
              </span>
            )}
            {!isOutOfStock(product) && discountPercent > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-semibold uppercase px-2 py-1 tracking-wider">
                -{discountPercent}%
              </span>
            )}
            {isLowStock(product) && !isOutOfStock(product) && (
              <span className="bg-yellow-500 text-white text-[10px] font-semibold uppercase px-2 py-1 tracking-wider">
                Low Stock
              </span>
            )}
          </div>

          {/* WISHLIST */}
          <button
            onClick={handleWishlistToggle}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 transition-all z-10"
          >
            <Heart
              className={`h-4 w-4 ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>

          {/* DESKTOP QUICK VIEW */}
          <div className="hidden md:flex flex-col absolute top-10 right-2 gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-10">
            <button
              onClick={handleQuickView}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 shadow-sm"
              title="Quick View"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* MOBILE PLUS BUTTON */}
          {!isOutOfStock(product) && (
            <button
              onClick={handleMobilePlusClick}
              className="md:hidden absolute bottom-2 right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg z-20 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              aria-label="Quick Add"
            >
              {showMobileQuickAdd ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          )}

          {/* MOBILE SLIM SHEET - IMPROVED */}
          <AnimatePresence>
            {showMobileQuickAdd && (
              <>
              {/* Backdrop to block interaction with page until explicit close */}
              <div
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={(e) => e.stopPropagation()}
                aria-hidden="true"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed md:hidden bottom-0 left-0 right-0 bg-white z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border-t border-gray-200"
                style={{ maxHeight: '70vh' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header - Slimmed */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-800 font-normal">{String(product.name)}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-normal text-gray-900">
                        Rs. {price.toLocaleString()}
                      </span>
                      {discountPercent > 0 && originalPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          Rs. {originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileQuickAdd(false)}
                    className="ml-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Content with proper spacing */}
                <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(70vh - 80px)' }}>
                  {/* Size Selection - with proper spacing */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Size
                      </span>
                      {selectedSize && (
                        <span className="text-xs text-gray-500">
                          Selected: <span className="font-medium">{String(selectedSize)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allSizes.map((size) => {
                        const isAvailable = available.includes(size);
                        const isSelected = selectedSize === size;

                        return (
                          <button
                            key={size}
                            onClick={() => isAvailable && setSelectedSize(size)}
                            disabled={!isAvailable}
                            className={`h-9 min-w-[44px] px-3 rounded text-xs font-normal border transition-all duration-200
                              ${
                                isSelected
                                  ? 'bg-black text-white border-black'
                                  : isAvailable
                                  ? 'bg-white text-gray-800 border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              }`}
                          >
                            {String(size)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selection - Only show if product has colors */}
                  {hasColors && (
                    <div className="mt-5 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-normal text-gray-700 uppercase tracking-wider">
                          Color
                        </span>
                        {(selectedColorName || selectedColor) && (
                          <span className="text-xs text-gray-500">
                            Selected: <span className="font-medium">{getColorName(selectedColorName || selectedColor)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {(product.variants || product.colors || []).map(
                          (v: any, idx: number) => {
                            const swatchImage = v?.swatchImage
                              ? typeof v.swatchImage === 'string'
                                ? v.swatchImage
                                : v.swatchImage.url
                              : undefined;
                            const hex =
                              v?.hex || v?.normalizedHex || v?.value || undefined;
                            const rawName =
                              v?.name ||
                              v?.displayName ||
                              v?.value ||
                              hex ||
                              `Color ${idx + 1}`;
                            const name = getColorName(rawName);
                            const id = String(v._id || v.id || idx);
                            const isSelected =
                              selectedVariantId === id || selectedColor === (hex || rawName);

                            return (
                              <div key={id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                                <button
                                  onClick={() => {
                                    if (product.variants) setSelectedVariantId(id);
                                    setSelectedColor(hex || rawName);
                                    setSelectedColorName(name);
                                  }}
                                  className={`w-9 h-9 md:w-11 md:h-11 rounded-sm border border-gray-300 overflow-hidden transition-all flex items-center justify-center ${
                                    isSelected ? 'border-black shadow-sm' : 'hover:border-gray-400'
                                  }`}
                                  style={hex && !swatchImage ? { backgroundColor: hex } : undefined}
                                  aria-label={String(name)}
                                >
                                  {swatchImage ? (
                                    <img src={swatchImage} alt={String(name)} className="w-full h-full object-cover" />
                                  ) : null}
                                </button>
                                <span className="text-[10px] text-gray-600 font-normal text-center leading-tight px-1">
                                  {String(name)}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add to cart button */}
                  <div className="sticky bottom-0 pt-4 pb-3 bg-white border-t border-gray-100 mt-4">
                    <button
                      onClick={handleAddToCart}
                      disabled={!selectedSize || (hasColors && !selectedColor && !selectedVariantId)}
                      className="w-full bg-black text-white py-3 rounded text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to cart
                    </button>
                  </div>
                </div>
              </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* DESKTOP BOTTOM BAR */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
            <div className="bg-white/95 backdrop-blur border-t px-3 py-2 flex items-center gap-2">
              {!isOutOfStock(product) ? (
                <>
                  <button
                    onClick={handleQuickView}
                    className="flex-1 py-1.5 bg-black text-white text-[11px] font-medium uppercase tracking-wide hover:bg-gray-900 flex items-center justify-center gap-1"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Quick add
                  </button>
                  <button
                    onClick={handleViewDetails}
                    className="px-2 py-1 text-[11px] font-normal text-gray-700 hover:underline"
                  >
                    Details
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-red-500 font-normal">Sold out</span>
              )}
            </div>
          </div>
        </div>

        {/* INFO SECTION */}
        <div className="p-3 flex flex-col gap-1">
          <h3 className="text-sm text-gray-800 font-normal leading-tight line-clamp-2 min-h-[2.5em]">
            <button
              type="button"
              onClick={handleViewDetails}
              className="text-left w-full cursor-pointer hover:underline focus:outline-none focus:underline"
            >
              {product.name}
            </button>
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-sm font-normal ${
                discountPercent > 0 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              Rs. {price.toLocaleString()}
            </span>
            {discountPercent > 0 && originalPrice && (
              <span className="text-xs text-gray-400 line-through decoration-gray-400">
                Rs. {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    displayRating !== null && i < Math.round(displayRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 fill-gray-100'
                  }`}
                />
              ))}
            </div>
            {reviewCount > 0 && (
              <span className="text-[10px] text-gray-400">({reviewCount})</span>
            )}
          </div>
          {/* Tags */}
          {(() => {
            const tags = normalizeTagsForDisplay((product as any).tags || []);
            if (!tags || !tags.length) return null;
            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.slice(0, 6).map((t, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-lg">{t}</span>
                ))}
              </div>
            );
          })()}
        </div>
      </motion.div>

      <QuickViewModal
        product={product as any}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </>
  );
};