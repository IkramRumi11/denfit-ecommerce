// src/components/QuickViewModal.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Heart, ShoppingCart } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { primaryImage, productId } from '../utils/productHelpers';
import { getAvailableStockForItem, getAvailableQuantity, isOutOfStock, isLowStock } from '../utils/stockHelpers';
import { useProductVariant } from '../hooks/useProductVariant';
import useLuxuryGallery from '../hooks/useLuxuryGallery';
import useReducedMotion from '../hooks/useReducedMotion';
import { getCategoryGroup, getDisplaySizesForProduct, getAvailableSizesForProduct } from '../utils/sizeRules';
import { getColorName } from '../utils/colorNames';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  sizes: string[];
  inStock: boolean;
  rating: number;
  category: string;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (size: string, color?: string) => void | Promise<any>;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [initialImageFromProps, setInitialImageFromProps] = useState<number>(0);
  const canonicalId = productId(product as any) || (product as any)?.id || (product as any)?._id;
  const { selectedVariantId, setSelectedVariantId } = useProductVariant(canonicalId);
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  // Normalize color list across variants or colors array
  const colorList = useMemo(() => {
    if (!product) return [];
    if (Array.isArray((product as any).variants) && (product as any).variants.length > 0) {
      return (product as any).variants.map((v: any, idx: number) => {
        const swatchImage = v?.swatchImage ? (typeof v.swatchImage === 'string' ? v.swatchImage : v.swatchImage.url) : undefined;
        const hex = v?.hex || v?.normalizedHex || v?.value || undefined;
        const rawName = v?.name || hex || `Color ${idx + 1}`;
        const name = getColorName(rawName);
        const id = String(v._id || v.id || `var-${idx}`);
        return { id, hex, name, rawName, swatchImage, variantId: id };
      });
    }
    if (Array.isArray((product as any).colors) && (product as any).colors.length > 0) {
      return (product as any).colors.map((c: any, idx: number) => {
        const swatchImage = c?.swatchImage ? (typeof c.swatchImage === 'string' ? c.swatchImage : c.swatchImage.url) : undefined;
        const hex = c?.hex || c?.normalizedHex || c?.value || undefined;
        const rawName = c?.name || c?.displayName || c?.value || hex || `Color ${idx + 1}`;
        const name = getColorName(rawName);
        const id = String(c._id || c.id || hex || `col-${idx}`);
        return { id, hex, name, rawName, swatchImage, variantId: undefined };
      });
    }
    return [];
  }, [product]);

  // Selected item live available stock
  const selectedStock = useMemo(() => {
    if (!product || !selectedSize) return 0;
    return getAvailableStockForItem(product, {
      size: selectedSize,
      color: selectedColor,
      colorName: selectedColorName,
      variantId: selectedVariantId
    });
  }, [product, selectedSize, selectedColor, selectedColorName, selectedVariantId]);

  const inCartQty = useMemo(() => {
    if (!product || !selectedSize) return 0;
    const pid = String(canonicalId || (product as any).id || (product as any)._id || '');
    return getItemQuantity(pid, selectedSize, selectedColor || selectedVariantId);
  }, [product, canonicalId, selectedSize, selectedColor, selectedVariantId, getItemQuantity]);

  const isAllInCart = selectedStock > 0 && inCartQty >= selectedStock;

  // Auto-select first in-stock color and size on open
  useEffect(() => {
    if (!isOpen || !product) return;

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
  }, [isOpen, product, colorList]);

  // allow hooks to run unconditionally; guard render below

  const _pid = canonicalId || (product as any)?.id || (product as any)?._id || '';
  const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(_pid) : false;

  // Normalize rating value: prefer top-level `rating`, then `ratings.average` when available
  const displayRating: number | null = product
    ? (typeof (product as any).rating === 'number'
      ? (product as any).rating
      : (product as any).ratings && typeof (product as any).ratings.average === 'number'
        ? (product as any).ratings.average
        : null)
    : null;
  const reviewCount: number = product ? ((product as any).reviewCount ?? (product as any).reviewsCount ?? (product as any).ratings?.count ?? 0) : 0;

  const handleAddToCart = async () => {
    if (!selectedSize) {
      showToast('Please select a size', 'error');
      return;
    }

    if (selectedStock <= 0) {
      showToast('This product is out of stock', 'error');
      return;
    }

    if (isAllInCart) {
      showToast(`You already have all ${selectedStock} available units in your cart`, 'warning');
      return;
    }

    try {
      const variantSnapshot = (() => {
        if (product && (product as any).variants && selectedVariantId) {
          const v = (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId));
          if (v) return { id: String(v._id || v.id), name: v.name, hex: v.hex, image: Array.isArray(v.images) && v.images[0] ? (typeof v.images[0] === 'string' ? v.images[0] : v.images[0].url) : undefined };
        }
        return undefined;
      })();

      if (onAddToCart) {
        try {
          setIsAdding(true);
          const colorKey = variantSnapshot ? (variantSnapshot.hex || variantSnapshot.name || variantSnapshot.id) : selectedColor;
          const maybePromise = onAddToCart(selectedSize, colorKey);
          if (maybePromise && typeof (maybePromise as any).then === 'function') {
            await (maybePromise as Promise<any>);
          }
          try { onClose(); } catch (e) { }
        } catch (e) {
          console.error('onAddToCart handler failed', e);
          showToast('Failed to add to cart', 'error');
        } finally {
          setIsAdding(false);
        }
        return;
      }

      const result = addItem({
        productId: _pid || product.id,
        name: product.name,
        price: product.price,
        image: primaryImage({ ...product, selectedVariantId } as any),
        size: selectedSize,
        color: selectedColor,
        colorName: variantSnapshot?.name ?? (selectedColorName || undefined),
        variantId: variantSnapshot?.id,
        variantName: variantSnapshot?.name,
        variantHex: variantSnapshot?.hex,
        variantImage: variantSnapshot?.image,
        quantity: 1,
        maxStock: selectedStock
      }, selectedStock);

      if (!result.success) {
        if (result.reason === 'MAX_REACHED') {
          showToast(`You already have all ${selectedStock} available units in your cart`, 'warning');
        } else {
          showToast('Product is out of stock', 'error');
        }
        return;
      }

      showToast(`${product.name} added to the cart`, 'success');
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleWishlistToggle = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage(product as any),
        category: product.category,
        rating: product.rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleViewFullDetails = () => {
    onClose();
    // Navigate using the canonical id so variant selection persists (useProductVariant keys match)
    // persist selected color and image index via query params so full view can restore state
    const params = new URLSearchParams();
    if (selectedColor) params.set('color', String(selectedColor));
    if (typeof gallery?.index === 'number') params.set('img', String(gallery.index));
    navigate(`/product/${canonicalId}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent backdrop clicks from closing the modal; require explicit close via button
    e.stopPropagation();
  };

  // Body scroll lock when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const docEl = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevDocOverflow = docEl.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    // prevent layout shift by compensating scrollbar width
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    // lock both <html> and <body> to be more robust across browsers/devices
    body.style.overflow = 'hidden';
    docEl.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBodyOverflow || '';
      docEl.style.overflow = prevDocOverflow || '';
      body.style.paddingRight = prevBodyPaddingRight || '';
    };
  }, [isOpen]);

  // Use variant/color-specific images first, then general product images
  const galleryImages: string[] = useMemo(() => {
    if (!product) return [];
    const toUrl = (img: any) => (typeof img === 'string' ? img : img?.url);
    const list: string[] = [];

    // If a variant is selected, prioritize its color-specific images
    if (selectedVariantId && Array.isArray((product as any).variants)) {
      const v = (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId));
      if (v && Array.isArray(v.images) && v.images.length > 0) {
        v.images.map(toUrl).filter(Boolean).forEach((url: string) => {
          if (!list.includes(url)) list.push(url);
        });
      }
    }

    // General product images
    if (Array.isArray(product.images)) {
      product.images.map(toUrl).filter(Boolean).forEach((url: string) => {
        if (!list.includes(url)) list.push(url);
      });
    }

    // Primary image fallback
    const prim = primaryImage({ ...product, selectedVariantId } as any);
    if (prim && !list.includes(prim)) {
      list.unshift(prim);
    }

    return list;
  }, [product, selectedVariantId]);

  // Gallery hook manages index/scale
  const gallery = useLuxuryGallery({ length: galleryImages.length, initialIndex: initialImageFromProps || 0, allowLoop: true });
  const { reducedMotion, setReducedMotion } = useReducedMotion();

  React.useEffect(() => {
    try { gallery.setIndex(0); gallery.zoomTo(1); } catch (e) { }
  }, [product, selectedVariantId]);

  // Autoplay / idle interaction state
  const autoPlayIntervalRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);

  const clearAutoPlay = () => {
    if (autoPlayIntervalRef.current) {
      window.clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
  };

  const startAutoPlay = () => {
    clearAutoPlay();
    if (!galleryImages || galleryImages.length <= 1 || reducedMotion) return;
    autoPlayIntervalRef.current = window.setInterval(() => {
      if (isInteractingRef.current || gallery.scale > 1) return;
      try { gallery.next(); } catch (e) {}
    }, 2800) as unknown as number;
  };

  const scheduleResumeAfterIdle = () => {
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    if (reducedMotion) return;
    idleTimeoutRef.current = window.setTimeout(() => {
      isInteractingRef.current = false;
      startAutoPlay();
      idleTimeoutRef.current = null;
    }, 3500) as unknown as number;
  };

  const markInteraction = () => {
    isInteractingRef.current = true;
    clearAutoPlay();
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    scheduleResumeAfterIdle();
  };

  // Start autoplay when galleryImages change or modal opens; clean up on unmount or close
  useEffect(() => {
    if (isOpen && galleryImages.length > 1 && !reducedMotion) {
      isInteractingRef.current = false;
      startAutoPlay();
    } else {
      clearAutoPlay();
    }
    return () => {
      clearAutoPlay();
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };
  }, [isOpen, galleryImages.length, reducedMotion]);

  // touch handlers (pinch to zoom / pan / swipe / multi-tap reset)
  const touchState = useRef({ startX: 0, startY: 0, startTime: 0, moved: false, initialDistance: 0, initialScale: 1, isPanning: false });

  const clampTranslate = (x: number, y: number) => {
    const limit = 100 * Math.max(1, gallery.scale - 1);
    return [Math.max(-limit, Math.min(limit, x)), Math.max(-limit, Math.min(limit, y))];
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t1 = e.touches[0];
    touchState.current.startX = t1.clientX;
    touchState.current.startY = t1.clientY;
    touchState.current.startTime = Date.now();
    touchState.current.moved = false;
    touchState.current.isPanning = gallery.scale > 1;
    if (e.touches.length === 2) {
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
      touchState.current.initialDistance = Math.hypot(dx, dy);
      touchState.current.initialScale = gallery.scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchState.current.startX;
      const dy = t.clientY - touchState.current.startY;
      if (!touchState.current.isPanning && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        touchState.current.moved = true;
        e.preventDefault();
      }
      if (touchState.current.isPanning) {
        const [nx, ny] = clampTranslate(gallery.tx + dx, gallery.ty + dy);
        gallery.setTx(nx); gallery.setTy(ny);
        touchState.current.startX = t.clientX; touchState.current.startY = t.clientY;
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0]; const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / (touchState.current.initialDistance || dist);
      gallery.zoomTo(Math.min(Math.max(1, touchState.current.initialScale * ratio), 5));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchState.current.moved) {
      const changed = e.changedTouches[0];
      const dx = changed.clientX - touchState.current.startX;
      const absDx = Math.abs(dx);
      if (absDx > 50 && gallery.scale === 1) {
        if (dx < 0) gallery.next(); else gallery.prev();
        return;
      }
    }
    const t = e.changedTouches[0];
    gallery.handleTap(t.clientX, t.clientY);
  };

  // Ensure a sensible default selected variant/color when the modal opens
  React.useEffect(() => {
    if (!product) return;
    try {
      // If product has exactly one variant, auto-select it
      if (Array.isArray((product as any).variants) && (product as any).variants.length === 1) {
        const v = (product as any).variants[0];
        const vid = String(v._id || v.id || '');
        setSelectedVariantId(vid);
        const hex = v.hex || v.normalizedHex || undefined;
        setSelectedColor(hex || v.name || '');
        setSelectedColorName(v.name || '');
        return;
      }

      // If product has exactly one top-level color, auto-select it
      if (Array.isArray((product as any).colors) && (product as any).colors.length === 1) {
        const c = (product as any).colors[0];
        const hex = c.hex || c.normalizedHex || c.value || undefined;
        setSelectedColor(hex || c.name || '');
        setSelectedColorName(c.name || '');
        return;
      }

      // Otherwise clear selections (do not override explicit user selection later)
      setSelectedColor('');
    } catch (e) {
      // ignore
    }
  }, [product, setSelectedVariantId]);

  // Helper to resolve selected color name for display (prefer variant.name then color.name)
  const getSelectedColorName = () => {
    if (!product) return '';
    // If a variant id is selected
    if (selectedVariantId && Array.isArray((product as any).variants)) {
      const v = (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId));
      if (v) return v.name || v.displayName || v.hex || '';
    }
    // If a color key is selected, try to find matching variant or color by hex or name
    if (selectedColor) {
      if (Array.isArray((product as any).variants)) {
        const v = (product as any).variants.find((x: any) => (x.hex || x.normalizedHex || x.value) === selectedColor || x.name === selectedColor);
        if (v) return v.name || v.displayName || selectedColor;
      }
      if (Array.isArray(product.colors)) {
        const c = product.colors.find((x: any) => (x.hex || x.normalizedHex || x.value) === selectedColor || x.name === selectedColor || x.displayName === selectedColor);
        if (c) return c.name || c.displayName || selectedColor;
      }
    }
    return selectedColor || '';
  };

  const nextImage = () => { markInteraction(); gallery.next(); gallery.zoomTo(1); };
  const prevImage = () => { markInteraction(); gallery.prev(); gallery.zoomTo(1); };

  const activeImageSrc = galleryImages[gallery.index] || (product ? primaryImage({ ...product, selectedVariantId } as any) : undefined);

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px) saturate(0.95)', overscrollBehavior: 'none' as any }}
        >
          <FocusTrap active={isOpen} focusTrapOptions={{ clickOutsideDeactivates: false, escapeDeactivates: false }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Quick View</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close Quick View"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]" style={{ overscrollBehavior: 'contain' as any }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                  {/* Images */}
                  <div className="space-y-4">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <button 
                        type="button"
                        onClick={() => { markInteraction(); if (gallery.scale > 1) gallery.zoomTo(1); else if (!reducedMotion) gallery.zoomTo(2.0); }} 
                        className="absolute z-10 right-2 top-2 bg-white/85 p-1.5 rounded-full shadow-sm hover:scale-105 transition-transform"
                        title="Zoom Image"
                        aria-label="Zoom Image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M21 21l-4.35-4.35" /><circle cx="11" cy="11" r="6" /></svg>
                      </button>

                      {galleryImages.length > 1 && (
                        <>
                          <button 
                            type="button"
                            onClick={prevImage} 
                            aria-label="Previous image" 
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center text-gray-800 shadow-md hover:scale-105 transition-all text-base font-semibold"
                          >
                            ‹
                          </button>
                          <button 
                            type="button"
                            onClick={nextImage} 
                            aria-label="Next image" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center text-gray-800 shadow-md hover:scale-105 transition-all text-base font-semibold"
                          >
                            ›
                          </button>
                        </>
                      )}

                      <div
                        tabIndex={0}
                        onKeyDown={(e) => {
                          markInteraction();
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (gallery.scale <= 1 && !reducedMotion) gallery.zoomTo(2.0); else gallery.zoomTo(1); }
                          if (e.key === 'Escape') { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); }
                          if (e.key === 'ArrowLeft') prevImage();
                          if (e.key === 'ArrowRight') nextImage();
                        }}
                        onFocus={() => { markInteraction(); if (!reducedMotion) gallery.zoomTo(1.4); }}
                        onBlur={() => { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); }}
                        onMouseEnter={() => { markInteraction(); if (!reducedMotion) gallery.zoomTo(1.8); }}
                        onMouseMove={(e) => {
                          markInteraction();
                          if (gallery.scale <= 1) return;
                          const el = e.currentTarget as HTMLDivElement;
                          const rect = el.getBoundingClientRect();
                          const relX = (e.clientX - rect.left) / rect.width;
                          const relY = (e.clientY - rect.top) / rect.height;
                          const maxTranslateX = (gallery.scale - 1) * rect.width / 2;
                          const maxTranslateY = (gallery.scale - 1) * rect.height / 2;
                          const tx = (0.5 - relX) * 2 * maxTranslateX;
                          const ty = (0.5 - relY) * 2 * maxTranslateY;
                          gallery.setTx(tx); gallery.setTy(ty);
                        }}
                        onMouseLeave={() => { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); }}
                        onMouseDown={(e) => {
                          markInteraction();
                          if (gallery.scale > 1) { e.preventDefault(); e.stopPropagation(); touchState.current.isPanning = true; touchState.current.startX = e.clientX; touchState.current.startY = e.clientY; }
                        }}
                        onMouseUp={(e) => { if (touchState.current.isPanning) { touchState.current.isPanning = false; e.preventDefault(); e.stopPropagation(); } }}
                        onTouchStart={(e) => { markInteraction(); if (gallery.scale > 1) e.stopPropagation(); handleTouchStart(e); }}
                        onTouchMove={(e) => { 
                          markInteraction(); 
                          if (gallery.scale > 1) { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            handleTouchMove(e); 
                          } 
                        }}
                        onTouchEnd={(e) => { markInteraction(); handleTouchEnd(e); }}
                        role="group"
                        aria-label="Quick view image viewer"
                        className="w-full h-full outline-none"
                        style={{ overflow: 'hidden', touchAction: gallery.scale > 1 ? 'none' : 'pan-y' }}
                      >
                        <div style={{ width: '100%', height: '100%', transition: 'transform 300ms cubic-bezier(.2,.9,.2,1)', transform: `translate3d(${gallery.tx}px, ${gallery.ty}px, 0) scale(${gallery.scale})`, willChange: 'transform' }}>
                          <img src={activeImageSrc} alt={product.name} loading="eager" className="w-full h-full object-cover transition-opacity duration-300" />
                        </div>
                      </div>
                    </div>

                    {/* Thumbnails */}
                    {galleryImages.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {galleryImages.map((src, index) => (
                          <button 
                            key={index} 
                            type="button"
                            onClick={() => { markInteraction(); gallery.setIndex(index); }} 
                            className={`aspect-square overflow-hidden rounded-lg border transition-all ${gallery.index === index ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-sm' : 'border-gray-200 hover:border-gray-400 opacity-75 hover:opacity-100'}`}
                          >
                            <img src={src} alt={`${product.name} ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reduce Motion Toggle */}
                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-gray-600 hover:text-gray-900">
                        <input
                          type="checkbox"
                          checked={reducedMotion}
                          onChange={() => setReducedMotion(!reducedMotion)}
                          aria-label="Reduce motion (disable hover zoom and auto-rotation)"
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span>Reduce motion (disable hover zoom & auto-rotation)</span>
                      </label>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {(() => {
                            if (displayRating === null) return Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 text-gray-300" />);
                            const full = Math.floor(displayRating);
                            const hasHalf = (displayRating - full) >= 0.5;
                            return Array.from({ length: 5 }).map((_, i) => {
                              if (i < full) return <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />;
                              if (i === full && hasHalf) {
                                return (
                                  <span key={i} className="relative inline-block h-4 w-4">
                                    <Star className="absolute left-0 top-0 h-4 w-4 text-gray-300" />
                                    <span className="absolute left-0 top-0 h-4 overflow-hidden" style={{ width: '50%' }}>
                                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    </span>
                                  </span>
                                );
                              }
                              return <Star key={i} className="h-4 w-4 text-gray-300" />;
                            });
                          })()}
                        </div>
                        <span className="font-medium text-gray-900">{displayRating !== null ? displayRating.toFixed(1) : 'No rating'}</span>
                        {reviewCount > 0 && (
                          <span className="text-xs text-gray-500">({reviewCount})</span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className={`text-sm font-medium ${isOutOfStock(product) ? 'text-red-600' : 'text-green-600'
                          }`}>
                          {isOutOfStock(product) ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                      Rs {product.price.toLocaleString()}
                    </p>

                    <p className="text-gray-600 text-sm leading-relaxed">
                      {product.description}
                    </p>

                    {/* Color / Variant Selection */}
                    {colorList.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Select Color: <span className="text-gray-500 font-normal">{getColorName(selectedColorName || selectedColor)}</span>
                        </h4>
                        <div className="flex items-center gap-3 flex-wrap">
                          {colorList.map((c: any) => {
                            const isSelected = (selectedVariantId && selectedVariantId === c.id) || selectedColor === c.hex || selectedColor === c.rawName;
                            const colorStock = getAvailableStockForItem(product, {
                              color: c.hex || c.rawName,
                              colorName: c.name,
                              variantId: c.variantId
                            });
                            const isColorOutOfStock = colorStock <= 0;

                            return (
                              <div key={c.id} className="flex flex-col items-center">
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

                                    // If currently selected size is out of stock in new color, pick first available size
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
                                  title={isColorOutOfStock ? `${c.name} (Out of stock)` : c.name}
                                  className={`relative w-9 h-9 md:w-11 md:h-11 rounded-sm border overflow-hidden transition-all flex items-center justify-center ${
                                    isColorOutOfStock
                                      ? 'border-gray-200 opacity-40 grayscale-[40%] cursor-not-allowed bg-gray-100'
                                      : isSelected
                                      ? 'border-black ring-2 ring-black/20 shadow-sm cursor-pointer'
                                      : 'border-gray-300 hover:border-gray-500 cursor-pointer'
                                  }`}
                                  style={c.hex && !c.swatchImage ? { backgroundColor: c.hex } : undefined}
                                >
                                  {c.swatchImage ? (
                                    <img src={c.swatchImage} alt={c.name} className="w-full h-full object-cover" />
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
                                  {isColorOutOfStock && (
                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-[140%] h-[1.5px] bg-red-500/80 -rotate-45 shadow-[0_0_2px_rgba(0,0,0,0.4)]" />
                                    </span>
                                  )}
                                </button>
                                <div className={`text-xs mt-1 capitalize text-center max-w-[4.5rem] break-words ${isColorOutOfStock ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                                  {String(c.name || '').trim()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Size Selection */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Select Size</h4>
                      <div className="flex gap-2 flex-wrap">
                        {(() => {
                          const allSizes = getDisplaySizesForProduct(product as any);
                          const variant = (product as any).variants && selectedVariantId
                            ? (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId))
                            : undefined;
                          const available = getAvailableSizesForProduct(product as any, variant);

                          return allSizes.map((size) => {
                            const isConfigured = available.includes(size);
                            const sizeStock = getAvailableStockForItem(product, {
                              size,
                              color: selectedColor,
                              colorName: selectedColorName,
                              variantId: selectedVariantId
                            });
                            const sizeInCart = getItemQuantity(_pid || product.id, size, selectedColor || selectedColorName, selectedVariantId);
                            const isAvailable = isConfigured && sizeStock > 0;
                            const isSelected = selectedSize === size;

                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => isAvailable && setSelectedSize(size)}
                                disabled={!isAvailable}
                                title={!isAvailable ? `${size} (Out of stock)` : sizeInCart > 0 ? `${size} (${sizeInCart} in cart)` : size}
                                className={`relative px-3.5 py-1.5 border rounded-lg font-medium transition-all text-sm overflow-hidden select-none ${
                                  isSelected && isAvailable
                                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                    : isAvailable
                                    ? 'border-gray-300 text-gray-700 hover:border-gray-900 bg-white cursor-pointer'
                                    : 'border-gray-200 text-gray-400 opacity-50 bg-gray-50 cursor-not-allowed'
                                }`}
                              >
                                <span className={!isAvailable ? 'line-through decoration-gray-400' : ''}>
                                  {size}
                                </span>
                                {sizeInCart > 0 && isAvailable && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                                )}
                                {!isAvailable && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-[140%] h-[1px] bg-gray-400/80 -rotate-45" />
                                  </span>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Stock & In-Cart Notice */}
                    {isAllInCart ? (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        All {selectedStock} available units of this variant are already in your cart.
                      </div>
                    ) : inCartQty > 0 && selectedStock > 0 ? (
                      <p className="mb-2 text-xs text-blue-600 font-medium">
                        {inCartQty} currently in your cart ({selectedStock - inCartQty} more available)
                      </p>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      {(() => {
                        const isCurrentSelectionOutOfStock = selectedStock <= 0;

                        return (
                          <button
                            onClick={handleAddToCart}
                            disabled={
                              isAdding ||
                              !selectedSize ||
                              (colorList.length > 0 && !selectedColor && !selectedVariantId) ||
                              isCurrentSelectionOutOfStock ||
                              isAllInCart
                            }
                            className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          >
                            {isAdding ? <LoadingSpinner size="sm" className="text-white" /> : <ShoppingCart className="h-4 w-4" />}
                            {isAdding
                              ? 'Adding...'
                              : isCurrentSelectionOutOfStock
                              ? 'Out of Stock'
                              : isAllInCart
                              ? 'All in Cart'
                              : inCartQty > 0
                              ? 'Add Another to Cart'
                              : 'Add to Cart'}
                          </button>
                        );
                      })()}
                      <button
                        onClick={handleWishlistToggle}
                        className={`p-3 border rounded-lg transition-colors flex items-center justify-center ${
                          isWishlisted
                            ? 'border-red-500 bg-red-50 text-red-600'
                            : 'border-gray-300 text-gray-400 hover:border-gray-400'
                        }`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            isWishlisted ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={handleViewFullDetails}
                      className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
};