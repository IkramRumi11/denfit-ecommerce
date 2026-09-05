// src/components/ProductCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Eye, ShoppingCart, Plus, X, Search } from 'lucide-react';
import FallbackImage from './ui/FallbackImage';
import { useProductVariant } from '../hooks/useProductVariant';
import useReducedMotion from '../hooks/useReducedMotion';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { QuickViewModal } from './QuickViewModal';
import type { Product } from '../types';
import { productId, primaryImage, priceNumber, canonicalProductId, resolveProductSelection, getConsistentColor } from '../utils/productHelpers';
import { getCategoryGroup, getDisplaySizesForProduct, getAvailableSizesForProduct } from '../utils/sizeRules';
import { getAvailableStockForItem, getAvailableQuantity, isOutOfStock, isLowStock } from '../utils/stockHelpers';
import { getColorName } from '../utils/colorNames';

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (size: string, color?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { addItem, getItemQuantity } = useCart();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  // State
  const [showMobileQuickAdd, setShowMobileQuickAdd] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const { selectedVariantId, setSelectedVariantId } = useProductVariant(productId(product));
  const [showQuickView, setShowQuickView] = useState(false);

  // Normalize color list across variants or colors array
  const colorList = React.useMemo(() => {
    if (!product) return [];
    if (Array.isArray((product as any).variants) && (product as any).variants.length > 0) {
      return (product as any).variants.map((v: any, idx: number) => {
        const swatchImage = v?.swatchImage ? (typeof v.swatchImage === 'string' ? v.swatchImage : v.swatchImage.url) : undefined;
        const consistent = getConsistentColor(v);
        const hex = consistent.hex;
        const name = consistent.name;
        const id = String(v._id || v.id || `var-${idx}`);
        return { id, hex, name, rawName: name, swatchImage, variantId: id };
      });
    }
    if (Array.isArray((product as any).colors) && (product as any).colors.length > 0) {
      return (product as any).colors.map((c: any, idx: number) => {
        const swatchImage = c?.swatchImage ? (typeof c.swatchImage === 'string' ? c.swatchImage : c.swatchImage.url) : undefined;
        const consistent = getConsistentColor(c);
        const hex = consistent.hex;
        const name = consistent.name;
        const id = String(c._id || c.id || hex || `col-${idx}`);
        return { id, hex, name, rawName: name, swatchImage, variantId: undefined };
      });
    }
    return [];
  }, [product]);

  // Auto-select first in-stock color and size when opening mobile quick add
  React.useEffect(() => {
    if (!showMobileQuickAdd || !product) return;

    let pickedColor = '';
    let pickedColorName = '';
    let pickedVariantId: any = null;

    if (colorList.length > 0) {
      const firstInStock = colorList.find((c: any) => {
        const stock = getAvailableStockForItem(product, { color: c.hex || c.rawName, colorName: c.name, variantId: c.variantId });
        return stock > 0;
      }) || colorList[0];

      if (firstInStock) {
        pickedColor = firstInStock.hex || firstInStock.rawName || '';
        pickedColorName = firstInStock.name || '';
        pickedVariantId = firstInStock.variantId || null;
      }
    }

    setSelectedColor(pickedColor);
    setSelectedColorName(pickedColorName);
    if (pickedVariantId) setSelectedVariantId(pickedVariantId);

    const allSizes = getDisplaySizesForProduct(product as any);
    const firstInStockSize = allSizes.find((s: string) => {
      const stock = getAvailableStockForItem(product, { size: s, color: pickedColor, colorName: pickedColorName, variantId: pickedVariantId });
      return stock > 0;
    }) || allSizes[0] || '';

    setSelectedSize(firstInStockSize);
  }, [showMobileQuickAdd, product, colorList]);

  // Derived data
  const categoryGroup = getCategoryGroup(product.category, product.subcategory);
  const allSizes = getDisplaySizesForProduct(product as any);
  const selectedVariant = (product as any).variants && Array.isArray((product as any).variants) && (selectedVariantId)
    ? (product as any).variants.find((v: any) => String(v._id || v.id || v.tempId) === String(selectedVariantId))
    : (product as any).variants && Array.isArray((product as any).variants) && (selectedColor || selectedColorName)
    ? (product as any).variants.find((v: any) => (selectedColor && (v.hex === selectedColor || v.color === selectedColor)) || (selectedColorName && v.name === selectedColorName))
    : (product as any).colors && Array.isArray((product as any).colors) && (selectedColor || selectedColorName)
    ? (product as any).colors.find((c: any) => (selectedColor && (c.hex === selectedColor || c.rawName === selectedColor || c.color === selectedColor)) || (selectedColorName && c.name === selectedColorName))
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
      return [s.replace(/^['`"]+|['`"]+$/g, '').trim()].filter(Boolean);
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

    if (hasColors && !selectedVariantId && !selectedColor) {
      showToast('Please select a color', 'error');
      return;
    }

    const availableStock = getAvailableStockForItem(product, {
      size: selectedSize,
      color: selectedColor,
      colorName: selectedColorName,
      variantId: selectedVariantId
    });

    if (availableStock <= 0) {
      showToast('Selected size is out of stock', 'error');
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
        const selection = resolveProductSelection(product, {
          size,
          color,
          colorName: selectedColorName,
          variantId
        });

        const imageSrc = primaryImage({ ...product, selectedVariantId: selection.variantId } as any) || '';
        const price = priceNumber(product);

        const availableStock = getAvailableStockForItem(product, {
          size: selection.size,
          color: selection.color,
          colorName: selection.colorName,
          variantId: selection.variantId,
          variantName: selection.variantName,
          variantHex: selection.variantHex
        });

        if (availableStock <= 0) {
          showToast('Selected variant is out of stock', 'error');
          return;
        }

        const result = addItem({
          productId: canonicalProductId(product),
          name: String(product.name),
          price,
          image: imageSrc,
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

        if (!result.success) {
          if (result.reason === 'MAX_REACHED') {
            showToast(`You already have all ${availableStock} available units in your cart`, 'warning');
          } else {
            showToast('Product is out of stock', 'error');
          }
          return;
        }

        showToast(`${String(product.name)} added to the cart`, 'success');
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

  // List of images for hover preview & rotation
  const productImages = React.useMemo(() => {
    const toUrl = (i: any) => (typeof i === 'string' ? i : i?.url);
    const list: string[] = [];

    // If a variant is selected, prioritize its color-specific images
    if (selectedVariant && Array.isArray((selectedVariant as any).images) && (selectedVariant as any).images.length > 0) {
      (selectedVariant as any).images.map(toUrl).filter(Boolean).forEach((url: string) => {
        if (!list.includes(url)) list.push(url);
      });
    }

    // Include general product images
    if (Array.isArray((product as any).images)) {
      (product as any).images.map(toUrl).filter(Boolean).forEach((url: string) => {
        if (!list.includes(url)) list.push(url);
      });
    }

    // Ensure primary image is at start
    const prim = primaryImage({ ...product, selectedVariantId });
    if (prim && !list.includes(prim)) {
      list.unshift(prim);
    }

    return list;
  }, [product, selectedVariant, selectedVariantId]);

  // Smooth hover cycling state
  const [hoverIndex, setHoverIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const cycleIntervalRef = useRef<number | null>(null);

  const clearCycleInterval = () => {
    if (cycleIntervalRef.current) {
      window.clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }
  };

  const handleCardMouseEnter = () => {
    if (reducedMotion || (typeof window !== 'undefined' && 'ontouchstart' in window)) return;
    setIsHovered(true);

    if (productImages.length > 1) {
      setHoverIndex(1); // Immediate smooth transition to 2nd image on hover
      clearCycleInterval();

      // If product has 3 or more images, smoothly cycle every 2.6 seconds
      if (productImages.length > 2) {
        cycleIntervalRef.current = window.setInterval(() => {
          setHoverIndex(prev => (prev + 1) % productImages.length);
        }, 2600) as unknown as number;
      }
    }
  };

  const handleCardMouseLeave = () => {
    setIsHovered(false);
    clearCycleInterval();
    setHoverIndex(0);
  };

  useEffect(() => {
    return () => clearCycleInterval();
  }, []);

  const displayImageSrc = (isHovered && productImages[hoverIndex]) 
    ? productImages[hoverIndex] 
    : (primaryImage({ ...product, selectedVariantId }) || productImages[0]);

  const totalInCartForProduct = getItemQuantity(productId(product));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex flex-col bg-white rounded-none sm:rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-transparent hover:border-gray-100"
      >
        {/* IMAGE */}
        <div 
          className="relative aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer"
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          onFocus={handleCardMouseEnter}
          onBlur={handleCardMouseLeave}
        >
          <button
            type="button"
            className="w-full h-full cursor-pointer focus:outline-none"
            onClick={handleViewDetails}
            aria-label={`View details for ${product.name}`}
          >
            <div className="w-full h-full overflow-hidden">
              <FallbackImage
                src={displayImageSrc}
                alt={String(product.name)}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </button>

          {/* IMAGE ROTATION INDICATOR DOTS (When cycling on hover) */}
          {productImages.length > 1 && isHovered && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none transition-opacity duration-300">
              {productImages.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    hoverIndex === idx ? 'w-3.5 bg-white shadow-md' : 'w-1 bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* BADGES */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
            {totalInCartForProduct > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-semibold uppercase px-2 py-0.5 tracking-wider shadow-sm rounded-sm">
                {totalInCartForProduct} in Cart
              </span>
            )}
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
            type="button"
            onClick={handleWishlistToggle}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 transition-all z-10 shadow-sm"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`h-4 w-4 ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>

          {/* DESKTOP QUICK VIEW / ZOOM ACTION */}
          <div className="hidden md:flex flex-col absolute top-11 right-2 gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-10">
            <button
              type="button"
              onClick={handleQuickView}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 shadow-sm hover:scale-105 transition-transform"
              title="Inspect Product & Quick View"
              aria-label="Inspect Product & Quick View"
            >
              <Search className="h-4 w-4" />
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
                        const sizeStock = getAvailableStockForItem(product, {
                          size,
                          color: selectedColor,
                          colorName: selectedColorName,
                          variantId: selectedVariantId
                        });
                        const isAvailable = sizeStock > 0;
                        const isSelected = selectedSize === size;

                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => isAvailable && setSelectedSize(size)}
                            disabled={!isAvailable}
                            className={`h-9 min-w-[44px] px-3 rounded text-xs font-normal border transition-all duration-200
                              ${
                                isSelected
                                  ? 'bg-black text-white border-black'
                                  : isAvailable
                                  ? 'bg-white text-gray-800 border-gray-300 hover:border-gray-500 hover:bg-gray-50 cursor-pointer'
                                  : 'bg-gray-100/70 text-gray-400 opacity-35 border-gray-200 cursor-not-allowed filter blur-[0.3px]'
                              }`}
                          >
                            {String(size)}
                          </button>
                        );
                      })}
                    </div>
                  </div>                  {/* Color Selection - Only show if product has colors */}
                  {colorList.length > 0 && (
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
                        {colorList.map((c: any) => {
                          const isSelected = (selectedVariantId && selectedVariantId === c.id) || selectedColor === c.hex || selectedColor === c.rawName;
                          const colorStock = getAvailableStockForItem(product, {
                            color: c.hex || c.rawName,
                            colorName: c.name,
                            variantId: c.variantId
                          });
                          const isColorOutOfStock = colorStock <= 0;

                          return (
                            <div key={c.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                              <button
                                type="button"
                                disabled={isColorOutOfStock}
                                onClick={() => {
                                  if (isColorOutOfStock) return;
                                  const colVal = c.hex || c.rawName || '';
                                  const colName = c.name || '';
                                  const vId = c.variantId;
                                  setSelectedColor(colVal);
                                  setSelectedColorName(colName);
                                  if (vId) setSelectedVariantId(vId);

                                  const currentSizeStock = getAvailableStockForItem(product, {
                                    size: selectedSize,
                                    color: colVal,
                                    colorName: colName,
                                    variantId: vId
                                  });
                                  if (currentSizeStock <= 0) {
                                    const allSizes = getDisplaySizesForProduct(product as any);
                                    const newSize = allSizes.find((s: string) => {
                                      return getAvailableStockForItem(product, { size: s, color: colVal, colorName: colName, variantId: vId }) > 0;
                                    }) || '';
                                    setSelectedSize(newSize);
                                  }
                                }}
                                className={`relative w-9 h-9 md:w-11 md:h-11 rounded-sm border overflow-hidden transition-all flex items-center justify-center ${
                                  isColorOutOfStock
                                    ? 'border-gray-300/60 opacity-30 grayscale-[60%] cursor-not-allowed filter blur-[0.4px]'
                                    : isSelected
                                    ? 'border-black ring-2 ring-black/20 shadow-sm cursor-pointer'
                                    : 'border-gray-300 hover:border-gray-500 cursor-pointer'
                                }`}
                                style={c.hex && !c.swatchImage ? { backgroundColor: c.hex } : undefined}
                                aria-label={String(c.name)}
                                title={isColorOutOfStock ? `${c.name} (Out of stock)` : c.name}
                              >
                                {c.swatchImage ? (
                                  <img src={c.swatchImage} alt={String(c.name)} className="w-full h-full object-cover" />
                                ) : c.hex ? null : (
                                  <span className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-700 bg-gray-100">
                                    {(c.name || '?').charAt(0)}
                                  </span>
                                )}
                                {isSelected && !isColorOutOfStock && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-sm border border-white/40">
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                      <path d="M1 4L4 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                              <span className={`text-[10px] text-center leading-tight px-1 ${isColorOutOfStock ? 'text-gray-400 opacity-60' : 'text-gray-700 font-normal'}`}>
                                {String(c.name)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add to cart button */}
                  <div className="sticky bottom-0 pt-4 pb-3 bg-white border-t border-gray-100 mt-4">
                    {(() => {
                      const selectedStock = getAvailableStockForItem(product, {
                        size: selectedSize,
                        color: selectedColor,
                        colorName: selectedColorName,
                        variantId: selectedVariantId
                      });
                      const inCartQty = getItemQuantity(
                        productId(product),
                        selectedSize,
                        selectedColor || selectedColorName,
                        selectedVariantId
                      );
                      const isCurrentSelectionOutOfStock = selectedStock <= 0;
                      const isAllInCart = selectedStock > 0 && inCartQty >= selectedStock;

                      return (
                        <div>
                          {isAllInCart ? (
                            <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 font-medium text-center">
                              All {selectedStock} available units are already in your cart.
                            </div>
                          ) : inCartQty > 0 && !isCurrentSelectionOutOfStock ? (
                            <p className="mb-2 text-xs text-blue-600 font-medium text-center">
                              {inCartQty} in cart ({selectedStock - inCartQty} more available)
                            </p>
                          ) : null}

                          <button
                            onClick={handleAddToCart}
                            disabled={
                              !selectedSize ||
                              (colorList.length > 0 && !selectedColor && !selectedVariantId) ||
                              isCurrentSelectionOutOfStock ||
                              isAllInCart
                            }
                            className="w-full bg-black text-white py-3 rounded text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {isCurrentSelectionOutOfStock 
                              ? 'Out of stock' 
                              : isAllInCart 
                              ? 'All in Cart' 
                              : inCartQty > 0 
                              ? 'Add Another to Cart' 
                              : 'Add to cart'}
                          </button>
                        </div>
                      );
                    })()}
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
                    {totalInCartForProduct > 0 ? `Quick add (${totalInCartForProduct} in cart)` : 'Quick add'}
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

          {/* Color Dots on Card */}
          {colorList.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
              {colorList.map((c: any) => {
                const isSelected = (selectedVariantId && selectedVariantId === c.id) || selectedColor === c.hex || selectedColor === c.rawName;
                const colorStock = getAvailableStockForItem(product, {
                  color: c.hex || c.rawName,
                  colorName: c.name,
                  variantId: c.variantId
                });
                const isOutOfStockColor = colorStock <= 0;

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isOutOfStockColor}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOutOfStockColor) return;
                      if (c.variantId) setSelectedVariantId(c.variantId);
                      setSelectedColor(c.hex || c.rawName || '');
                      setSelectedColorName(c.name);
                    }}
                    title={isOutOfStockColor ? `${c.name} (Out of stock)` : c.name}
                    className={`relative w-4 h-4 rounded-full border transition-all ${
                      isOutOfStockColor
                        ? 'border-gray-300/60 opacity-30 grayscale-[60%] cursor-not-allowed filter blur-[0.4px]'
                        : isSelected
                        ? 'border-black ring-1 ring-black/40 scale-110 shadow-sm cursor-pointer'
                        : 'border-gray-300 hover:scale-110 hover:border-gray-600 cursor-pointer'
                    }`}
                    style={c.hex && !c.swatchImage ? { backgroundColor: c.hex } : undefined}
                  >
                    {c.swatchImage ? (
                      <img src={c.swatchImage} alt={c.name} className="w-full h-full object-cover rounded-full" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* Brand & Tags */}
          {(() => {
            const brandName = (product.brand || '').trim();
            const tags = normalizeTagsForDisplay((product as any).tags || []);
            if (!brandName && (!tags || !tags.length)) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {brandName && (
                  <span className="text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-900 px-2 py-1 rounded-lg border border-gray-200/60">
                    {brandName}
                  </span>
                )}
                {tags.slice(0, 6).map((t, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-lg">
                    {t}
                  </span>
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