// src/components/QuickViewModal.tsx
import React, { useState, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Heart, ShoppingCart } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { primaryImage, productId } from '../utils/productHelpers';
import { getAvailableQuantity, isOutOfStock, isLowStock } from '../utils/stockHelpers';
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
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

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
    // Color selection is handled by the UI state - if colors exist and none is selected,
    // the UI will prevent the user from adding to cart. No duplicate validation needed.

    try {
      const variantSnapshot = (() => {
        if (product && (product as any).variants && selectedVariantId) {
          const v = (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId));
          if (v) return { id: String(v._id || v.id), name: v.name, hex: v.hex, image: Array.isArray(v.images) && v.images[0] ? (typeof v.images[0] === 'string' ? v.images[0] : v.images[0].url) : undefined };
        }
        return undefined;
      })();

        if (onAddToCart) {
          // Delegate actual add to parent handler. If it returns a promise, await it
          // and only close the modal when the add completes successfully. This
          // makes QuickView safe to use when parent handlers manage adds.
          try {
            setIsAdding(true);
            const colorKey = variantSnapshot ? (variantSnapshot.hex || variantSnapshot.name || variantSnapshot.id) : selectedColor;
            const maybePromise = onAddToCart(selectedSize, colorKey);
            if (maybePromise && typeof (maybePromise as any).then === 'function') {
              await (maybePromise as Promise<any>);
            }
            // Close modal after successful add
            try { onClose(); } catch (e) {}
          } catch (e) {
            console.error('onAddToCart handler failed', e);
            showToast('Failed to add to cart', 'error');
          } finally {
            setIsAdding(false);
          }
          return;
        }

      addItem({
        productId: product.id,
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
        quantity: 1
      });

      showToast(`${product.name} has been added to the cart`, 'success');
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

  // Use general product images only for the Quick View gallery to keep image
  // selection consistent with color/size selection and cart flow. Variant
  // specific image handling caused inconsistent button enablement for some
  // products, so we prefer the stable general image set here.
  const galleryImages: string[] = (() => {
    if (!product) return [];
    const toUrl = (img: any) => (typeof img === 'string' ? img : img?.url);
    const general = (product.images || []).map(toUrl).filter(Boolean) as string[];
    return general;
  })();

  // Reset selectedImage when gallery changes
  // gallery hook will manage index/scale; reset when product/context changes
  const gallery = useLuxuryGallery({ length: galleryImages.length, initialIndex: initialImageFromProps || 0, allowLoop: true });
  const { reducedMotion, setReducedMotion } = useReducedMotion();
  React.useEffect(() => {
    try { gallery.setIndex(0); gallery.zoomTo(1); } catch (e) {}
  }, [product]);

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

  const nextImage = () => { gallery.next(); gallery.zoomTo(1); };
  const prevImage = () => { gallery.prev(); gallery.zoomTo(1); };

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
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                    <button onClick={() => { if (gallery.scale > 1) gallery.zoomTo(1); else if (!reducedMotion) gallery.zoomTo(2.0); }} className="absolute z-10 right-2 top-2 bg-white/80 p-1 rounded-full hover:scale-105">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="6"/></svg>
                    </button>
                    <button onClick={prevImage} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1 rounded-full hover:scale-105">
                      ‹
                    </button>
                    <button onClick={nextImage} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1 rounded-full hover:scale-105">
                      ›
                    </button>
                    <div
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (gallery.scale <= 1 && !reducedMotion) gallery.zoomTo(2.0); else gallery.zoomTo(1); }
                        if (e.key === 'Escape') { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); }
                        if (e.key === 'ArrowLeft') gallery.prev();
                        if (e.key === 'ArrowRight') gallery.next();
                      }}
                      onFocus={() => { if (!reducedMotion) gallery.zoomTo(1.4); }}
                      onBlur={() => { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); }}
                      onMouseEnter={() => { if (!reducedMotion) gallery.zoomTo(2.0); }}
                      onMouseMove={(e) => {
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
                        if (gallery.scale > 1) { e.preventDefault(); e.stopPropagation(); touchState.current.isPanning = true; touchState.current.startX = e.clientX; touchState.current.startY = e.clientY; }
                      }}
                      onMouseUp={(e) => { if (touchState.current.isPanning) { touchState.current.isPanning = false; e.preventDefault(); e.stopPropagation(); } }}
                      onTouchStart={(e) => { e.stopPropagation(); if (gallery.scale > 1) e.preventDefault(); handleTouchStart(e); }}
                      onTouchMove={(e) => { e.stopPropagation(); if (gallery.scale > 1) e.preventDefault(); handleTouchMove(e); }}
                      onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e); }}
                      onWheel={(e) => { e.preventDefault(); e.stopPropagation(); gallery.onWheelZoom?.(e.deltaY, e.clientX, e.clientY); }}
                      role="group"
                      aria-label="Quick view image viewer"
                      className="w-full h-full outline-none"
                      style={{ overflow: 'hidden', touchAction: gallery.scale > 1 ? 'none' : 'pan-y', overscrollBehavior: 'contain' as any }}
                    >
                      <div style={{ width: '100%', height: '100%', transition: 'transform 200ms cubic-bezier(.2,.9,.2,1)', transform: `translate3d(${gallery.tx}px, ${gallery.ty}px, 0) scale(${gallery.scale})`, willChange: 'transform' }}>
                        <img src={activeImageSrc} alt={product.name} loading="eager" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {galleryImages.map((src, index) => (
                      <button key={index} onClick={() => gallery.setIndex(index)} className={`aspect-square overflow-hidden rounded-lg border transition-all ${gallery.index === index ? 'border-blue-600 border-2' : 'border-gray-200'}`}>
                        <img src={src} alt={`${product.name} ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={reducedMotion} onChange={() => setReducedMotion(!reducedMotion)} aria-label="Disable hover zoom" />
                      <span>Reduce motion (disable hover zoom)</span>
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
                          <span className={`text-sm font-medium ${
                            isOutOfStock(product) ? 'text-red-600' : 'text-green-600'
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
                  {( (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0) ? (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Select Color: <span className="text-gray-500 font-normal">{getColorName(selectedColorName || selectedColor)}</span></h4>
                      <div className="flex items-center gap-3">
                        {(product as any).variants.map((v: any, idx: number) => {
                          const swatchImage = v?.swatchImage ? (typeof v.swatchImage === 'string' ? v.swatchImage : v.swatchImage.url) : undefined;
                          const hex = v?.hex || v?.normalizedHex || v?.value || undefined;
                          const rawName = v?.name || hex || `Variant ${idx + 1}`;
                          const name = getColorName(rawName);
                          const id = String(v._id || v.id || idx);
                          const isSelected = selectedVariantId === id || selectedColor === hex || selectedColor === rawName;
                            return (
                              <div key={id} className="flex flex-col items-center">
                                <button
                                  onClick={() => { setSelectedVariantId(id); const cname = name; setSelectedColor(hex || rawName || ''); setSelectedColorName(cname); }}
                                  title={name}
                                  className={`relative w-8 h-8 md:w-10 md:h-10 rounded-sm border border-gray-300 overflow-visible transition-all flex items-center justify-center ${isSelected ? 'border-black shadow-sm' : 'hover:border-gray-400'}`}
                                  style={hex && !swatchImage ? { backgroundColor: hex } : undefined}
                                >
                                  {swatchImage ? (
                                    <img src={swatchImage} alt={name} className="w-full h-full object-cover" />
                                  ) : hex ? null : (
                                    <span className="w-full h-full flex items-center justify-center text-xs text-gray-600">{(name || '?').charAt(0)}</span>
                                  )}
                                  {isSelected && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-sm border border-white/40">
                                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                        <path d="M1 4L4 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  )}
                                </button>
                                <div className="text-xs text-gray-600 mt-1 capitalize text-center max-w-[4rem] break-words">{String(name || '').trim()}</div>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  ) : (
                    product.colors && Array.isArray(product.colors) && product.colors.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Select Color: <span className="text-gray-500 font-normal">{getColorName(selectedColorName || selectedColor)}</span></h4>
                        <div className="flex items-center gap-3">
                          {product.colors.map((c: any, idx: number) => {
                            const swatchImage = c?.swatchImage ? (typeof c.swatchImage === 'string' ? c.swatchImage : c.swatchImage.url) : undefined;
                            const hex = c?.hex || c?.normalizedHex || c?.value || undefined;
                            const rawName = c?.name || c?.displayName || c?.value || hex || `Color ${idx + 1}`;
                            const name = getColorName(rawName);
                            const isSelected = selectedColor === hex || selectedColor === rawName;
                            return (
                              <div key={c._id || c.id || idx} className="flex flex-col items-center">
                                <button
                                  onClick={() => { setSelectedColor(hex || rawName); setSelectedColorName(name); }}
                                  title={name}
                                  className={`w-8 h-8 md:w-10 md:h-10 rounded-sm border border-gray-300 overflow-visible transition-all flex items-center justify-center ${isSelected ? 'border-black shadow-sm' : 'hover:border-gray-400'}`}
                                  style={hex && !swatchImage ? { backgroundColor: hex } : undefined}
                                >
                                  {swatchImage ? (
                                    <img src={swatchImage} alt={name} className="w-full h-full object-cover" />
                                  ) : hex ? null : (
                                    <span className="w-full h-full flex items-center justify-center text-xs text-gray-600">{(name || '?').charAt(0)}</span>
                                  )}
                                  {isSelected && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-sm border border-white/40">
                                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                        <path d="M1 4L4 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  )}
                                </button>
                                <div className="text-xs text-gray-600 mt-1 capitalize text-center max-w-[4rem] break-words">{String(name || '').trim()}</div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Show selected color name (thin text) */}
                        {(selectedColor || selectedVariantId) && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 font-light">Color</div>
                            <div className="text-sm text-gray-700 font-light capitalize">{getSelectedColorName() || 'As shown'}</div>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Size Selection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Select Size</h4>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const allSizes = getDisplaySizesForProduct(product as any);
                        const variant = (product as any).variants && selectedVariantId
                          ? (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId))
                          : undefined;
                        const available = getAvailableSizesForProduct(product as any, variant);

                        return allSizes.map((size) => {
                          const isAvailable = available.includes(size);
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => isAvailable && setSelectedSize(size)}
                              disabled={!isAvailable}
                              className={`relative px-4 py-2 border rounded-lg font-medium transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : isAvailable
                                  ? 'border-gray-300 text-gray-700 hover:border-gray-400 bg-white'
                                    : 'border-gray-200 text-gray-400 opacity-60 cursor-not-allowed bg-gray-50'
                              }`}
                            >
                              {size}
                                {/* Unavailable sizes are intentionally shown faded (no cross) */}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAddToCart}
                      disabled={
                        isAdding || isOutOfStock(product) ||
                        !selectedSize ||
                        (product.colors && Array.isArray(product.colors) && product.colors.length > 0 && !selectedColor && !selectedVariantId)
                      }
                      className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isAdding ? <LoadingSpinner size="sm" className="text-white" /> : <ShoppingCart className="h-4 w-4" />}
                      {isAdding ? 'Adding...' : 'Add to Cart'}
                    </button>
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