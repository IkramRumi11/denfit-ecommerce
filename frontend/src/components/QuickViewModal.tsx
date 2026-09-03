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
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white">
                <div className="flex items-center gap-2">
                  <span className="h-[1px] w-6 bg-neutral-400" />
                  <h2 className="text-xs md:text-sm font-medium text-neutral-900 tracking-[0.24em] uppercase">Quick View</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  aria-label="Close Quick View"
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]" style={{ overscrollBehavior: 'contain' as any }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
                  {/* Images */}
                  <div className="space-y-4">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-100">
                      <button 
                        type="button"
                        onClick={() => { markInteraction(); if (gallery.scale > 1) gallery.zoomTo(1); else if (!reducedMotion) gallery.zoomTo(2.0); }} 
                        className="absolute z-10 right-3 top-3 bg-white/90 p-2 rounded-full shadow-sm hover:scale-105 transition-transform backdrop-blur-sm"
                        title="Zoom Image"
                        aria-label="Zoom Image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-700"><path d="M21 21l-4.35-4.35" /><circle cx="11" cy="11" r="6" /></svg>
                      </button>

                      {galleryImages.length > 1 && (
                        <>
                          <button 
                            type="button"
                            onClick={prevImage} 
                            aria-label="Previous image" 
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white w-9 h-9 rounded-full flex items-center justify-center text-neutral-800 shadow-md hover:scale-105 transition-all text-lg font-light backdrop-blur-sm"
                          >
                            ‹
                          </button>
                          <button 
                            type="button"
                            onClick={nextImage} 
                            aria-label="Next image" 
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white w-9 h-9 rounded-full flex items-center justify-center text-neutral-800 shadow-md hover:scale-105 transition-all text-lg font-light backdrop-blur-sm"
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
                            className={`aspect-square overflow-hidden rounded-xl border transition-all ${gallery.index === index ? 'border-neutral-900 ring-2 ring-neutral-900/20 shadow-sm' : 'border-neutral-200 hover:border-neutral-400 opacity-75 hover:opacity-100'}`}
                          >
                            <img src={src} alt={`${product.name} ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reduce Motion Toggle */}
                    <div className="mt-2 text-sm text-neutral-500 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-neutral-500 hover:text-neutral-800">
                        <input
                          type="checkbox"
                          checked={reducedMotion}
                          onChange={() => setReducedMotion(!reducedMotion)}
                          aria-label="Reduce motion (disable hover zoom and auto-rotation)"
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span>Reduce motion</span>
                      </label>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-5 flex flex-col justify-between">
                    <div>
                      {/* Top Brand / Category tag */}
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400">
                          {product.category ? `Denfit • ${product.category}` : 'Denfit Maison'}
                        </p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
                          isOutOfStock(product) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock(product) ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {isOutOfStock(product) ? 'Sold Out' : 'Available'}
                        </span>
                      </div>

                      {/* Title with lesser visual spacing */}
                      <h3 className="text-lg md:text-xl font-medium text-neutral-900 tracking-tight uppercase leading-snug mb-1.5">
                        {product.name}
                      </h3>

                      {/* Ratings */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          {(() => {
                            if (displayRating === null) return Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 text-neutral-300" />);
                            const full = Math.floor(displayRating);
                            const hasHalf = (displayRating - full) >= 0.5;
                            return Array.from({ length: 5 }).map((_, i) => {
                              if (i < full) return <Star key={i} className="h-3.5 w-3.5 text-yellow-400 fill-current" />;
                              if (i === full && hasHalf) {
                                return (
                                  <span key={i} className="relative inline-block h-3.5 w-3.5">
                                    <Star className="absolute left-0 top-0 h-3.5 w-3.5 text-neutral-300" />
                                    <span className="absolute left-0 top-0 h-3.5 overflow-hidden" style={{ width: '50%' }}>
                                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                                    </span>
                                  </span>
                                );
                              }
                              return <Star key={i} className="h-3.5 w-3.5 text-neutral-300" />;
                            });
                          })()}
                        </div>
                        <span className="text-xs font-medium text-neutral-800">{displayRating !== null ? displayRating.toFixed(1) : '5.0'}</span>
                        {reviewCount > 0 && (
                          <span className="text-[11px] text-neutral-400">({reviewCount} reviews)</span>
                        )}
                      </div>

                      {/* Pricing Section with Sale Strikethrough & Multi-line Free Shipping Text */}
                      {(() => {
                        const rawOriginalPrice = (product as any)?.originalPrice || (product as any)?.compareAtPrice;
                        const originalPriceNumber = typeof rawOriginalPrice === 'number' && Number.isFinite(rawOriginalPrice) 
                          ? rawOriginalPrice 
                          : (rawOriginalPrice ? Number(rawOriginalPrice) : undefined);
                        const currentPrice = typeof product.price === 'number' ? product.price : Number(product.price || 0);
                        const hasSaleDiscount = Boolean(originalPriceNumber && originalPriceNumber > currentPrice);
                        const discountPercent = hasSaleDiscount && originalPriceNumber
                          ? Math.round(((originalPriceNumber - currentPrice) / originalPriceNumber) * 100)
                          : 0;

                        return (
                          <div className="py-3 px-4 rounded-2xl bg-neutral-50 border border-neutral-100 mb-4">
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <span className={`text-2xl md:text-3xl font-light tracking-wide ${
                                hasSaleDiscount ? 'text-red-600 font-semibold' : 'text-neutral-900 font-medium'
                              }`}>
                                Rs. {currentPrice.toLocaleString()}
                              </span>
                              {hasSaleDiscount && originalPriceNumber && (
                                <span className="text-sm md:text-base text-neutral-400 line-through decoration-neutral-400 font-normal">
                                  Rs. {originalPriceNumber.toLocaleString()}
                                </span>
                              )}
                              {hasSaleDiscount && discountPercent > 0 && (
                                <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                                  -{discountPercent}% OFF
                                </span>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t border-neutral-200/60 flex flex-col gap-0.5">
                              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 tracking-wide uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Free
                              </div>
                              <p className="text-[11px] text-neutral-500 font-normal leading-normal">
                                shipping on orders over ₨5,000 • 14-day complimentary returns
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      <p className="text-neutral-600 text-xs md:text-sm leading-relaxed mb-5 font-light">
                        {product.description}
                      </p>

                      {/* Color / Variant Selection */}
                      {colorList.length > 0 && (
                        <div className="mb-5">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-700">
                              Color: <span className="text-neutral-500 font-normal">{getColorName(selectedColorName || selectedColor)}</span>
                            </span>
                          </div>
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
                                    className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full border overflow-hidden transition-all flex items-center justify-center ${
                                      isColorOutOfStock
                                        ? 'border-neutral-200 opacity-40 grayscale-[40%] cursor-not-allowed bg-neutral-100'
                                        : isSelected
                                        ? 'border-neutral-900 ring-2 ring-neutral-900/20 shadow-sm scale-105 cursor-pointer'
                                        : 'border-neutral-300 hover:border-neutral-500 cursor-pointer'
                                    }`}
                                    style={c.hex && !c.swatchImage ? { backgroundColor: c.hex } : undefined}
                                  >
                                    {c.swatchImage ? (
                                      <img src={c.swatchImage} alt={c.name} className="w-full h-full object-cover rounded-full" />
                                    ) : c.hex ? null : (
                                      <span className="w-full h-full flex items-center justify-center text-xs font-medium text-neutral-700 bg-neutral-100">
                                        {(c.name || '?').charAt(0)}
                                      </span>
                                    )}
                                    {isSelected && !isColorOutOfStock && (
                                      <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                        <svg width="12" height="10" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                          <path d="M1 4L4 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </span>
                                    )}
                                    {isColorOutOfStock && (
                                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-[140%] h-[1.5px] bg-red-500/80 -rotate-45" />
                                      </span>
                                    )}
                                  </button>
                                  <div className={`text-[10px] mt-1 capitalize text-center max-w-[4rem] truncate ${isColorOutOfStock ? 'text-neutral-400 line-through' : 'text-neutral-600'}`}>
                                    {String(c.name || '').trim()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size Selection */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-700">Select Size</span>
                          {selectedSize && (
                            <span className="text-xs text-neutral-500">Selected: <span className="font-semibold text-neutral-900">{selectedSize}</span></span>
                          )}
                        </div>
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
                                  className={`relative px-4 py-2 border rounded-xl font-medium transition-all text-xs tracking-wider uppercase select-none ${
                                    isSelected && isAvailable
                                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                                      : isAvailable
                                      ? 'border-neutral-200 text-neutral-800 hover:border-neutral-900 bg-white cursor-pointer'
                                      : 'border-neutral-100 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                                  }`}
                                >
                                  <span className={!isAvailable ? 'line-through decoration-neutral-400' : ''}>
                                    {size}
                                  </span>
                                  {sizeInCart > 0 && isAvailable && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                                  )}
                                  {!isAvailable && (
                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-[140%] h-[1px] bg-neutral-300 -rotate-45" />
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
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          All {selectedStock} available units of this variant are already in your cart.
                        </div>
                      ) : inCartQty > 0 && selectedStock > 0 ? (
                        <p className="mb-3 text-xs text-blue-600 font-medium">
                          {inCartQty} currently in your cart ({selectedStock - inCartQty} more available)
                        </p>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-3">
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
                              className="flex-1 bg-black text-white py-3.5 px-6 rounded-full font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] shadow-sm active:scale-[0.99]"
                            >
                              {isAdding ? <LoadingSpinner size="sm" className="text-white" /> : <ShoppingCart className="h-4 w-4" />}
                              {isAdding
                                ? 'Adding...'
                                : isCurrentSelectionOutOfStock
                                ? 'Sold Out'
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
                          className={`p-3.5 border rounded-full transition-colors flex items-center justify-center ${
                            isWishlisted
                              ? 'border-red-500 bg-red-50 text-red-600'
                              : 'border-neutral-200 text-neutral-400 hover:border-neutral-500 hover:text-neutral-700'
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

                      {/* View Full Details Button */}
                      <button
                        onClick={handleViewFullDetails}
                        className="w-full border border-neutral-200 text-neutral-800 py-3 rounded-full text-xs font-medium uppercase tracking-[0.2em] hover:bg-neutral-50 hover:border-neutral-400 transition-all text-center"
                      >
                        Explore Full Piece Details →
                      </button>
                    </div>
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