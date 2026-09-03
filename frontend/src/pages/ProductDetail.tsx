// src/pages/ProductDetail.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Share2, ArrowLeft, Truck, Shield, RotateCcw, Lock } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
// NOTE: Ensure this path is correct for your project, or replace with your actual Auth context
import { useAuth } from '../context/AuthContext'; 
import SizeGuide from '../components/SizeGuide';
import ReviewSummary from '../components/reviews/ReviewSummary';
import ReviewList from '../components/reviews/ReviewList';
import ReviewForm from '../components/reviews/ReviewForm';
import trackEvent from '../utils/analytics';
import { productsAPI } from '../api';
import FallbackImage from '../components/ui/FallbackImage';
import { primaryImage } from '../utils/productHelpers';
import { useProductVariant } from '../hooks/useProductVariant';
import useLuxuryGallery from '../hooks/useLuxuryGallery';
import useReducedMotion from '../hooks/useReducedMotion';
import { getCategoryGroup, getDisplaySizesForProduct, getAvailableSizesForProduct } from '../utils/sizeRules';
import { getAvailableStockForItem, getAvailableQuantity, isOutOfStock, isLowStock } from '../utils/stockHelpers';
import { getColorName } from '../utils/colorNames';

// --- Accordion Component ---
const AccordionItem: React.FC<{
  title: string;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onClick, children }) => {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left focus:outline-none group bg-white"
      >
        <span className="text-base md:text-lg font-medium text-gray-900 group-hover:text-gray-600 transition-colors uppercase tracking-wide">
          {title}
        </span>
        <span className="text-2xl font-light text-gray-400 group-hover:text-gray-900 transition-colors select-none">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm text-gray-600 leading-relaxed font-light">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  
  // Safe access to auth context
  const authContext = useAuth();
  const user = authContext?.user;

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  // gallery state
  const [initialImageFromQuery, setInitialImageFromQuery] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Accordion State
  const [openSection, setOpenSection] = useState<string | null>('details');

  // Reviews refresh token to force reload after new review submission
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  // Temporary container for a newly added review to prepend to the list
  const [prependReview, setPrependReview] = useState<any | null>(null);

  // Ref for Reviews Section
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Share popover state
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!shareRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recentlyViewedList, setRecentlyViewedList] = useState<any[]>([]);

  const pid = String(productId ?? '');
  const { selectedVariantId, setSelectedVariantId } = useProductVariant(pid);
  const location = useLocation();

  // Normalize rating value
  let displayRating: number | null = null;
  try {
    const raw = typeof (product as any)?.rating === 'number' ? (product as any).rating : (product as any)?.ratings?.average;
    displayRating = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  } catch (e) { displayRating = null; }

  // Unified image pool logic
  const galleryImages = useMemo(() => {
    if (!product) return [] as string[];

    const toUrl = (img: any) => (typeof img === 'string' ? img : img?.url);
    const general = (product.images || []).map(toUrl).filter(Boolean) as string[];

    const variantImages: string[] = [];
    if (Array.isArray((product as any).variants)) {
      (product as any).variants.forEach((v: any) => {
        if (Array.isArray(v.images)) v.images.map(toUrl).filter(Boolean).forEach((u: string) => variantImages.push(u));
      });
    }

    const colorEntryImages = (colorKey: string | null) => {
      if (!colorKey) return [] as string[];
      const normalize = (s: any) => (s ? String(s).toLowerCase().trim().replace(/^#/, '') : '');
      const targetKey = normalize(colorKey);
      if (Array.isArray((product as any).variants)) {
        // First try matching by variant id/_id (selectedVariantId is often an id)
        const byId = (product as any).variants.find((v: any) => String(v._id || v.id) === String(colorKey));
        if (byId && Array.isArray(byId.images) && byId.images.length) return byId.images.map(toUrl).filter(Boolean) as string[];

        // Fallback to matching by normalized hex or name
        const v = (product as any).variants.find((x: any) => {
            const hex = x?.hex || x?.normalizedHex || x?.value || '';
          const name = x?.name || '';
          return normalize(hex) === targetKey || String(name).toLowerCase().trim() === targetKey;
        });
        if (v && Array.isArray(v.images) && v.images.length) return v.images.map(toUrl).filter(Boolean) as string[];
      }
      if (Array.isArray(product.colors)) {
        const c = product.colors.find((x: any) => {
          const hex = x?.hex || x?.normalizedHex || x?.value;
          const name = x?.name || x?.displayName || x?.value;
          return String(hex) === String(colorKey) || String(name) === String(colorKey);
        });
        if (c) {
          if (Array.isArray(c.images) && c.images.length) return c.images.map(toUrl).filter(Boolean) as string[];
          if (c?.image) return [toUrl(c.image)].filter(Boolean) as string[];
        }
      }
      return [] as string[];
    };

    const selectedPool = colorEntryImages(selectedVariantId || selectedColor) || [];

    // If a variant/color is selected, show its images first, but include all general
    // and other variant images in the slider so users can navigate the complete set.
    const merged: string[] = [];
    const pushIfNew = (u: string) => { if (u && !merged.includes(u)) merged.push(u); };

    // 1) selected variant images (if any)
    selectedPool.forEach(pushIfNew);
    // 2) general product images
    general.forEach(pushIfNew);
    // 3) all other variant images
    variantImages.forEach(pushIfNew);

    return merged;
  }, [product, selectedVariantId, selectedColor]);

  useEffect(() => {
    setInitialImageFromQuery(0);
  }, [selectedVariantId, selectedColor, galleryImages]);

  // Ensure a sensible default selected variant/color on initial load
  useEffect(() => {
    if (!selectedVariantId && (product as any)?.variants && (product as any).variants.length) {
      const first = (product as any).variants[0];
      try { setSelectedVariantId(String(first._id || first.id)); } catch (e) { console.warn('failed to set default variant', e); }
    }
    if (!selectedColor && product?.colors && Array.isArray(product.colors) && product.colors.length) {
      const firstC = product.colors[0];
                    const hex = firstC?.hex || firstC?.normalizedHex || firstC?.value || '';
      if (hex) setSelectedColor(hex);
    }
  }, [product, selectedVariantId, selectedColor, setSelectedVariantId]);

  // hook-based gallery
  const gallery = useLuxuryGallery({ length: galleryImages.length, initialIndex: initialImageFromQuery || 0, allowLoop: true, onIndexChange: (i) => setInitialImageFromQuery(i) });
  const activeImageSrc = galleryImages[gallery.index] || primaryImage({ ...product, selectedVariantId } as any);
  const nextImage = () => { gallery.next(); gallery.zoomTo(1); };
  const prevImage = () => { gallery.prev(); gallery.zoomTo(1); };
  // mark interactions when users manually navigate
  const nextImageUser = () => { markInteraction(); nextImage(); };
  const prevImageUser = () => { markInteraction(); prevImage(); };

  // Thumbnail slider refs/state
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Autoplay / idle interaction state
  const autoPlayIntervalRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const { reducedMotion, setReducedMotion } = useReducedMotion();

  const clearAutoPlay = () => {
    if (autoPlayIntervalRef.current) { window.clearInterval(autoPlayIntervalRef.current); autoPlayIntervalRef.current = null; }
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
    // mark as interacting and stop autoplay until idle
    isInteractingRef.current = true;
    clearAutoPlay();
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    scheduleResumeAfterIdle();
  };

  const updateThumbScrollState = () => {
    const el = thumbsRef.current;
    if (!el) return setCanScrollLeft(false) || setCanScrollRight(false);
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    updateThumbScrollState();
    const el = thumbsRef.current;
    if (!el) return;
    const onScroll = () => updateThumbScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [galleryImages.length]);

  // Start autoplay when gallery images change; stop on unmount
  useEffect(() => {
    if (!reducedMotion) {
      isInteractingRef.current = false;
      startAutoPlay();
    } else {
      clearAutoPlay();
    }
    return () => {
      clearAutoPlay();
      if (idleTimeoutRef.current) { window.clearTimeout(idleTimeoutRef.current); idleTimeoutRef.current = null; }
    };
  }, [galleryImages.length, reducedMotion]);

  const scrollThumbsBy = (amount: number) => {
    const el = thumbsRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Advanced touch/pinch/pan handling
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
    markInteraction();
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

  // Desktop hover-to-zoom
  const containerRef = useRef<HTMLDivElement | null>(null);
  const HOVER_ZOOM_SCALE = 2.0;
  const FOCUS_ZOOM_SCALE = 1.4;
  const TRANSITION_MS = 200;
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!containerRef.current || reducedMotion) return;
    gallery.zoomTo(HOVER_ZOOM_SCALE);
    markInteraction();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    if (gallery.scale <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const maxTranslateX = (gallery.scale - 1) * rect.width / 2;
    const maxTranslateY = (gallery.scale - 1) * rect.height / 2;
    const tx = (0.5 - relX) * 2 * maxTranslateX;
    const ty = (0.5 - relY) * 2 * maxTranslateY;
    gallery.setTx(tx); gallery.setTy(ty);
    markInteraction();
  };
  const handleMouseLeave = () => {
    gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (gallery.scale <= 1 && !reducedMotion) gallery.zoomTo(HOVER_ZOOM_SCALE); else gallery.zoomTo(1);
    } else if (e.key === 'Escape') {
      gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0);
    } else if (e.key === 'ArrowLeft') {
      gallery.prev();
    } else if (e.key === 'ArrowRight') {
      gallery.next();
    }
  };

  const handleFocus = () => { if (!reducedMotion) gallery.zoomTo(FOCUS_ZOOM_SCALE); };
  const handleBlur = () => { gallery.zoomTo(1); gallery.setTx(0); gallery.setTy(0); };

  // Normalize product payloads from API to avoid array-like / numeric-keyed objects
  const sanitizeProduct = (input: any): any => {
    if (input == null) return input;
    if (typeof input !== 'object') return input;

    // If it's already an array, sanitize each element
    if (Array.isArray(input)) return input.map(sanitizeProduct);

    // Detect array-like objects with numeric keys (e.g. {0: {...}, 1: {...}}) and convert to array
    const keys = Object.keys(input);
    const numericKeys = keys.filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    // If all keys are numeric (array-like object), convert to an array
    if (numericKeys.length && numericKeys.length === keys.length) {
      return numericKeys.map(k => sanitizeProduct((input as any)[k]));
    }

    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      // Common case: image objects like { url: '...' } -> prefer the url string where used in JSX
      if (v && typeof v === 'object' && Object.keys(v).length === 1 && typeof (v as any).url === 'string') {
        out[k] = (v as any).url;
        continue;
      }
      out[k] = sanitizeProduct(v);
    }
    return out;
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    productsAPI
      .getById(productId as string)
      .then((res: any) => {
        const p = res && (res.product || res.data?.product) ? (res.product || res.data?.product) : null;
        if (!p) {
          throw new Error('Product not found');
        }
        let normalized: any = { ...(p || {}), id: p.id || p._id || p.slug || '' };
        // If API returned an array-like container (some backends accidentally return [product] or an object with numeric keys), normalize to the first element
        if (Array.isArray(normalized) && normalized.length) normalized = normalized[0];
        if (normalized && typeof normalized === 'object' && Object.prototype.hasOwnProperty.call(normalized, '0') && normalized[0]) normalized = normalized[0];

        // Sanitize entire product payload to avoid nested numeric-keyed objects or unexpected shapes
        try {
          normalized = sanitizeProduct(normalized);
        } catch (e) {
          console.warn('sanitizeProduct failed', e);
        }

        if (normalized.selectedVariant && (normalized.selectedVariant._id || normalized.selectedVariant.id)) {
          try { setSelectedVariantId(String(normalized.selectedVariant._id || normalized.selectedVariant.id)); } catch(e) { console.warn('failed to set initial selectedVariantId', e); }
        }
        if (mounted) setProduct(normalized);

          try {
          const qs = new URLSearchParams(location.search);
          const color = qs.get('color');
          const img = qs.get('img');
          if (color) setSelectedColor(color);
          if (img && !Number.isNaN(Number(img))) setInitialImageFromQuery(Math.max(0, Number(img)));
        } catch (e) {
          // ignore
        }
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || 'Failed to load product');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [productId, setSelectedVariantId, location.search]);

  // Persist and load recently viewed
  useEffect(() => {
    if (!product) return;
    try {
      const key = 'recentlyViewed';
      const currentId = String(product.id || product._id || product.slug || '');
      const rawImg = primaryImage(product) || (product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : '') || '';
      const snapshot = {
        id: currentId,
        _id: product._id || currentId,
        name: String(product.name ?? ''),
        image: String(rawImg ?? ''),
        price: typeof product.price === 'number' ? product.price : String(product.price ?? ''),
        slug: String(product.seo?.slug ?? product.slug ?? currentId)
      };
      const raw = localStorage.getItem(key);
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      
      const filteredExisting = arr.filter((p: any) => String(p.id || p._id) !== currentId);
      setRecentlyViewedList(filteredExisting.slice(0, 6));

      const updatedArr = [snapshot, ...filteredExisting].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(updatedArr));
    } catch (e) {
      // ignore storage errors
    }
  }, [product]);

  // --- MOVED UP: Share Functions to be available for useEffect ---
  const trackShare = async (method: string, extra: Record<string, any> = {}) => {
    try {
      await trackEvent('share', { method, productId: product?.id || product?._id, productName: product?.name, ...extra });
    } catch (e) {}
  };

  const handleNativeShare = async () => {
    try {
      const url = window.location.href;
      const title = product?.name || 'Product';
      const text = `${product?.name || ''} - Rs ${product?.price?.toLocaleString?.() || ''}`.trim();
      if (navigator.share) {
        await navigator.share({ title, text, url });
        showToast('Shared successfully', 'success');
        await trackShare('native', { result: 'success' });
        setShareOpen(false);
        return;
      }
      // Fallback directly to clipboard copy
      await handleCopyLink();
    } catch (err) {
      console.error('Share failed', err);
      setShareOpen(false);
    }
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // fallback below
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (e) {
      return false;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await copyTextToClipboard(url);
      showToast('Product link copied to clipboard', 'success');
      await trackShare('clipboard', { result: 'success' });
      setShareOpen(false);
    } catch (e) {
      showToast('Product link copied to clipboard', 'success');
      setShareOpen(false);
    }
  };

  const openPopup = (u: string) => window.open(u, '_blank', 'noopener,noreferrer,width=600,height=600');

  const handleSocialClick = async (method: 'twitter' | 'facebook' | 'whatsapp') => {
    try {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`${product?.name || ''} - Rs ${product?.price?.toLocaleString?.() || ''}`.trim());
      let shareUrl = '';
      if (method === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      if (method === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      if (method === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
      openPopup(shareUrl);
      await trackShare(method, { result: 'clicked' });
      setShareOpen(false);
    } catch (e) {
      console.error('social share failed', e);
    }
  };

  // --- MOVED UP: The useEffect that caused the crash ---
  // Auto-copy the product URL to clipboard when the popover opens (best-effort)
  useEffect(() => {
    if (!shareOpen) return;
    (async () => {
      try {
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
          showToast('Product link copied to clipboard', 'success');
          await trackShare('clipboard', { result: 'auto' });
        } else {
          // fallback: prompt so user can copy
          // eslint-disable-next-line no-alert
          window.prompt('Copy this product link', url);
          await trackShare('clipboard', { result: 'prompt' });
        }
      } catch (e) {
        console.error('auto copy failed', e);
      }
    })();
  }, [shareOpen]);

  const itemsAvailable = useMemo(() => {
    if (!product) return 0;
    return getAvailableStockForItem(product, {
      size: selectedSize,
      color: selectedColor,
      colorName: selectedColorName,
      variantId: selectedVariantId
    });
  }, [product, selectedVariantId, selectedSize, selectedColor, selectedColorName]);

  const displayAvailableQuantity = typeof (product as any)?.availableQuantity === 'number' ? (product as any).availableQuantity : itemsAvailable;

  const canonicalPid = String(product?.id || product?._id || productId || '');

  const inCartQty = useMemo(() => {
    if (!product || !selectedSize) return 0;
    return getItemQuantity(canonicalPid, selectedSize, selectedColor || selectedVariantId);
  }, [product, selectedSize, selectedColor, selectedVariantId, canonicalPid, getItemQuantity]);

  const remainingStockAllowed = Math.max(0, displayAvailableQuantity - inCartQty);
  const isAllInCart = Boolean(selectedSize && (selectedColor || selectedVariantId) && displayAvailableQuantity > 0 && inCartQty >= displayAvailableQuantity);

  // --- Reset selected size if it is not available in the newly selected color ---
  useEffect(() => {
    if (product && selectedSize) {
      const variant = (product as any).variants && selectedVariantId
        ? (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId))
        : undefined;
      const available = getAvailableSizesForProduct(product, variant);
      const availableNormalized = (available || []).map(String);
      if (!availableNormalized.includes(String(selectedSize))) {
        setSelectedSize('');
      }
    }
  }, [selectedVariantId, selectedColor, product, selectedSize]);

  // --- Automatically adjust quantity down if it exceeds the displayAvailableQuantity ---
  useEffect(() => {
    if (selectedSize && (selectedVariantId || selectedColor) && quantity > displayAvailableQuantity) {
      setQuantity(Math.max(1, displayAvailableQuantity));
    }
  }, [displayAvailableQuantity, quantity, selectedSize, selectedVariantId, selectedColor]);

  // --- Safe to return conditionally now that all hooks are called ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">LOADING...</h1>
          <p className="text-gray-600 mb-6">Fetching product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/shop" className="btn-primary">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(String(product?.id || product?._id || '')) : false;

  const handleAddToCart = async () => {
    if (!selectedSize) {
      showToast('Please select a size', 'error');
      return false;
    }
    if (product.variants && Array.isArray(product.variants) && product.variants.length && !selectedVariantId) {
      showToast('Please select a color', 'error');
      return false;
    }
    if (!selectedVariantId && product.colors && Array.isArray(product.colors) && product.colors.length && !selectedColor) {
      showToast('Please select a color', 'error');
      return false;
    }

    if (displayAvailableQuantity <= 0) {
      showToast('This product is out of stock', 'error');
      return false;
    }

    if (inCartQty >= displayAvailableQuantity) {
      showToast(`You already have all ${displayAvailableQuantity} available units in your cart`, 'warning');
      return false;
    }

    setIsAdding(true);
    try {
      const variantSnapshot = (() => {
        if ((product as any).variants && selectedVariantId) {
          const v = (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId));
          if (v) return { id: String(v._id || v.id), name: v.name, hex: v.hex, image: Array.isArray(v.images) && v.images[0] ? (typeof v.images[0] === 'string' ? v.images[0] : v.images[0].url) : undefined };
        }
        return undefined;
      })();

      const result = addItem({
        productId: canonicalPid,
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
        quantity: quantity,
        maxStock: displayAvailableQuantity
      }, displayAvailableQuantity);

      if (!result.success) {
        if (result.reason === 'MAX_REACHED') {
          showToast(`You already have all ${displayAvailableQuantity} available units in your cart`, 'warning');
        } else if (result.reason === 'OUT_OF_STOCK') {
          showToast('This product is currently out of stock', 'error');
        }
        return false;
      }

      if (result.reason === 'PARTIAL_ADD') {
        showToast(`Added ${result.addedQuantity} units to cart (maximum available reached)`, 'info');
      } else {
        showToast(`${product.name} added to the cart`, 'success');
      }
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist({
        id: canonicalPid,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        category: product.category,
        rating: product.rating
      });
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleBuyNow = async () => {
    const success = await handleAddToCart();
    if (success) {
      setTimeout(() => {
        navigate('/cart');
      }, 300);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const scrollToReviews = () => {
    if (reviewsRef.current) {
      reviewsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to find the color name for display
  const getSelectedColorName = () => {
    if (!selectedColor) return '';
    // check colors array
    const colorObj = product.colors?.find((c: any) => (c.hex === selectedColor || c.value === selectedColor));
    if (colorObj) return colorObj.name || colorObj.displayName || selectedColor;
    // check variants
    if (product.variants) {
        const v = product.variants.find((v:any) => v.hex === selectedColor);
        if (v) return v.name;
    }
    return selectedColor;
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div className="space-y-4">
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <button onClick={() => { if (gallery.scale > 1) gallery.zoomTo(1); else if (!reducedMotion) gallery.zoomTo(HOVER_ZOOM_SCALE); }} className="absolute z-10 right-2 top-2 bg-white/80 p-1 rounded-full hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="6"/></svg>
              </button>
              <button onClick={prevImageUser} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1 rounded-full hover:scale-105">‹</button>
              <button onClick={nextImageUser} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1 rounded-full hover:scale-105">›</button>

              <div
                ref={containerRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseDown={(e) => {
                  if (gallery.scale > 1) {
                    e.preventDefault(); e.stopPropagation();
                    (e.currentTarget as HTMLElement).setPointerCapture?.((e as unknown as any).pointerId || 1);
                    touchState.current.isPanning = true;
                    touchState.current.startX = e.clientX;
                    touchState.current.startY = e.clientY;
                  }
                }}
                onMouseUp={(e) => {
                  if (touchState.current.isPanning) { touchState.current.isPanning = false; e.preventDefault(); e.stopPropagation(); }
                }}
                onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
                onTouchMove={(e) => { 
                  e.stopPropagation(); 
                  if (gallery.scale > 1) e.preventDefault();
                  handleTouchMove(e); 
                }}
                onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e); }}
                
                role="group"
                aria-label="Product image viewer"
                className="w-full h-full outline-none"
                style={{ display: 'block', overflow: 'hidden', touchAction: gallery.scale > 1 ? 'none' : 'pan-y', transition: `transform ${TRANSITION_MS}ms cubic-bezier(.2,.9,.2,1)` }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    transition: 'transform 220ms cubic-bezier(.2,.9,.2,1)',
                    transform: `translate3d(${gallery.tx}px, ${gallery.ty}px, 0) scale(${gallery.scale})`,
                    willChange: 'transform'
                  }}
                >
                  <FallbackImage
                    key={String(activeImageSrc)}
                    src={activeImageSrc}
                    alt={String(product.name ?? '')}
                    loading="eager"
                    className={`w-full h-full object-cover`}
                  />
                </div>
              </div>
            </motion.div>

            {/* Thumbnail Slider */}
            <div className="relative mt-3">
              <button
                type="button"
                aria-label="Scroll thumbnails left"
                onClick={() => { markInteraction(); scrollThumbsBy(-Math.floor((thumbsRef.current?.clientWidth || 240) * 0.8)); }}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-800 ${canScrollLeft ? 'opacity-100' : 'opacity-40 pointer-events-auto'}`}
              >
                ‹
              </button>

              <div
                ref={thumbsRef}
                className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-2 scroll-smooth touch-pan-y touch-manipulation"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
              >
                {galleryImages.map((image: any, index: number) => {
                  const imageSrc = typeof image === 'string' ? image : (image as any).url;
                  return (
                    <button
                      key={`thumbnail-${index}-${imageSrc}`}
                      type="button"
                      onClick={() => { gallery.setIndex(index); markInteraction(); }}
                      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border transition-all ${
                        gallery.index === index ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-sm' : 'border-gray-200 hover:border-gray-400 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <FallbackImage src={imageSrc} alt={`${product.name} ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Scroll thumbnails right"
                onClick={() => { markInteraction(); scrollThumbsBy(Math.floor((thumbsRef.current?.clientWidth || 240) * 0.8)); }}
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-800 ${canScrollRight ? 'opacity-100' : 'opacity-40 pointer-events-auto'}`}
              >
                ›
              </button>
            </div>

            {/* Reduce Motion Toggle */}
            <div className="mt-2.5 text-sm text-gray-600 flex items-center gap-3">
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
          <div className="space-y-5">
            <div>
              {/* Category Eyebrow */}
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400">
                  {product.category ? `Denfit • ${product.category}` : 'Denfit Maison • Edition 2026'}
                </p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                  isOutOfStock(product) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock(product) ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  {isOutOfStock(product) ? 'Sold Out' : 'In Stock'}
                </span>
              </div>

              {/* Title with lesser visual spacing */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-neutral-900 tracking-[0.08em] uppercase mb-2 leading-tight">
                {String(product.name ?? '')}
              </h1>
              
              {/* Clickable Review Stars - Smooth scrolls to review section */}
              <button 
                onClick={scrollToReviews}
                className="flex items-center gap-3 mb-3 group cursor-pointer hover:opacity-80 transition-all focus:outline-none focus:ring-1 focus:ring-neutral-900 rounded-lg p-1 -ml-1"
                title="Read reviews"
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {(() => {
                      if (displayRating === null) return Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 text-neutral-300" />);
                      const full = Math.floor(displayRating);
                      const hasHalf = (displayRating - full) >= 0.5;
                      return Array.from({ length: 5 }).map((_, i) => {
                        if (i < full) return <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />;
                        if (i === full && hasHalf) {
                          return (
                            <span key={i} className="relative inline-block h-4 w-4">
                              <Star className="absolute left-0 top-0 h-4 w-4 text-neutral-300" />
                              <span className="absolute left-0 top-0 h-4 overflow-hidden" style={{ width: '50%' }}>
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              </span>
                            </span>
                          );
                        }
                        return <Star key={i} className="h-4 w-4 text-neutral-300" />;
                      });
                    })()}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{displayRating !== null ? String(displayRating.toFixed(1)) : '5.0'}</span>
                  <span className="ml-2 text-xs text-neutral-500 underline underline-offset-4 group-hover:text-neutral-900 transition-colors">
                    {/* Safely render ReviewSummary */}
                    {(() => {
                      try {
                        return <ReviewSummary productId={String(product.id || product._id)} />;
                      } catch (error) {
                        return <span>Reviews</span>;
                      }
                    })()}
                  </span>
                </div>
              </button>

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
                  <div className="py-4 px-5 rounded-2xl bg-neutral-50 border border-neutral-100 my-3">
                    <div className="flex items-baseline gap-3.5 flex-wrap">
                      <span className={`text-3xl md:text-4xl font-light tracking-wide ${
                        hasSaleDiscount ? 'text-red-600 font-semibold' : 'text-neutral-900 font-medium'
                      }`}>
                        Rs. {currentPrice.toLocaleString()}
                      </span>
                      {hasSaleDiscount && originalPriceNumber && (
                        <span className="text-lg md:text-xl text-neutral-400 line-through decoration-neutral-400 font-normal">
                          Rs. {originalPriceNumber.toLocaleString()}
                        </span>
                      )}
                      {hasSaleDiscount && discountPercent > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
                          -{discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-neutral-200/60 flex flex-col gap-0.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 tracking-wide uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Free
                      </div>
                      <p className="text-xs text-neutral-500 font-normal leading-relaxed">
                        shipping on orders over ₨5,000 • 14-day complimentary returns
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Tags */}
              {(() => {
                const normalizeTags = (input: any): string[] => {
                  if (!input) return [];
                  if (Array.isArray(input)) return input.map(String).map(s=>s.trim()).filter(Boolean);
                  if (typeof input === 'string') {
                    let s = input.trim();
                    try { for (let i=0;i<5;i++) { const parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed.flatMap((x:any)=> typeof x === 'string' ? x : String(x)).map(String).map(s=>s.trim()).filter(Boolean); if (typeof parsed === 'string') { s = parsed; continue; } return [String(parsed)]; } } catch(e) {}
                    if (s.includes(',')) return s.split(',').map((x:string)=>x.trim()).filter(Boolean);
                    return [s.replace(/^['`"]+|['`"]+$/g,'').trim()].filter(Boolean);
                  }
                  return [String(input)];
                };
                const tags = normalizeTags(product?.tags || []);
                if (!tags.length) return null;
                return (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((t, i) => (
                      <span key={i} className="text-[11px] uppercase tracking-wider bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <p className="text-neutral-600 leading-relaxed font-light text-sm md:text-base">{String(product.description ?? '')}</p>

            {/* Color Selection */}
            {product.colors && Array.isArray(product.colors) && product.colors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Select Color: <span className="text-gray-500 font-normal">{getColorName(selectedColorName || selectedColor)}</span></h3>
                <div className="flex items-center gap-3 mb-3">
                  {product.colors.map((c: any, idx: number) => {
                    const hex = c?.hex || c?.normalizedHex || c?.value || '#000000';
                    const name = c?.name && !c.name.startsWith('#') ? c.name : getColorName(hex);
                    const colorId = c?.id || c?._id || hex || `color-${idx}`;
                    const isSelected = selectedColor === hex || selectedColor === name;
                    const colorStock = getAvailableStockForItem(product, { color: hex, colorName: name });
                    const isColorOutOfStock = colorStock <= 0;

                    return (
                      <div key={colorId} className="flex flex-col items-center">
                        <button
                          type="button"
                          disabled={isColorOutOfStock}
                          onClick={() => {
                            if (isColorOutOfStock) return;
                            setSelectedColor(hex);
                            setSelectedColorName(String(name || hex || ''));
                            try {
                              if (product?.variants && Array.isArray(product.variants)) {
                                const normalize = (s: any) => (s ? String(s).toLowerCase().trim().replace(/^#/, '') : '');
                                const tid = normalize(hex);
                                const matched = product.variants.find((v: any) => {
                                  const hv = v?.hex || v?.normalizedHex || v?.value || '';
                                  const vName = v?.name || '';
                                  return normalize(hv) === tid || String(vName).toLowerCase().trim() === tid;
                                });
                                if (matched && (matched._id || matched.id)) setSelectedVariantId(String(matched._id || matched.id));
                              }
                            } catch (e) {
                              // ignore selection errors
                            }
                          }}
                          title={isColorOutOfStock ? `${name} (Out of stock)` : name}
                          className={`relative w-9 h-9 md:w-11 md:h-11 rounded-sm border transition-all flex items-center justify-center overflow-hidden ${
                            isColorOutOfStock
                              ? 'border-gray-200 opacity-40 grayscale-[40%] cursor-not-allowed bg-gray-100'
                              : isSelected
                              ? 'border-black shadow-sm cursor-pointer'
                              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                          }`}
                          style={{ backgroundColor: hex }}
                        >
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
                        <div className={`text-xs mt-1 capitalize text-center max-w-[4.5rem] break-words ${isColorOutOfStock ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                          {String(name || '').trim()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select Size</h3>
              <div className="flex gap-2 flex-wrap">
                {(() => {
                  const allSizes = getDisplaySizesForProduct(product);
                  const variant = (product as any).variants && selectedVariantId
                    ? (product as any).variants.find((x: any) => String(x._id || x.id) === String(selectedVariantId))
                    : undefined;
                  const available = getAvailableSizesForProduct(product, variant);
                  const availableNormalized = (available || []).map(String);
                  return allSizes.map((size, idx) => {
                    const sizeStr = String(size);
                    const isConfigured = availableNormalized.includes(sizeStr);
                    const sizeStock = getAvailableStockForItem(product, {
                      size: sizeStr,
                      color: selectedColor,
                      colorName: selectedColorName,
                      variantId: selectedVariantId
                    });
                    const isAvailable = isConfigured && sizeStock > 0;

                    return (
                      <button
                        key={`${sizeStr}-${idx}`}
                        type="button"
                        onClick={() => isAvailable && setSelectedSize(sizeStr)}
                        disabled={!isAvailable}
                        title={!isAvailable ? `${sizeStr} (Out of stock)` : sizeStr}
                        className={`relative px-3.5 py-1.5 border rounded-lg font-medium transition-all text-sm overflow-hidden select-none ${
                          selectedSize === sizeStr && isAvailable
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : isAvailable
                            ? 'border-gray-300 text-gray-700 hover:border-gray-900 bg-white cursor-pointer'
                            : 'border-gray-200 text-gray-400 opacity-50 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={!isAvailable ? 'line-through decoration-gray-400' : ''}>
                          {sizeStr}
                        </span>
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
              {((product.sizeGuide && (product.sizeGuide.image || product.sizeGuide.tableHtml || product.sizeGuide.description)) ) && (
                <div className="mt-3">
                  <button onClick={() => setSizeGuideOpen(true)} className="text-sm text-blue-600 hover:underline">View size guide</button>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
                {inCartQty > 0 && (
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full font-medium">
                    {inCartQty} in cart
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isAllInCart}
                    className="px-4 py-2 hover:bg-gray-100 rounded-l-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 min-w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(remainingStockAllowed > 0 ? remainingStockAllowed : 1, quantity + 1))}
                    disabled={quantity >= remainingStockAllowed || isAllInCart}
                    className="px-4 py-2 hover:bg-gray-100 rounded-r-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {isOutOfStock(product, selectedSize, selectedColor || selectedVariantId) ? 'Out of stock' : `${displayAvailableQuantity} items available`}
                </span>
              </div>

              {/* All in cart or low stock warning */}
              {isAllInCart ? (
                <div className="mt-2 text-xs md:text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span>ℹ️</span> All {displayAvailableQuantity} available units are already in your cart.
                </div>
              ) : selectedSize && (selectedVariantId || selectedColor) && displayAvailableQuantity > 0 && displayAvailableQuantity <= 15 ? (
                <div className="mt-2 text-xs md:text-sm font-medium transition-all duration-300">
                  {displayAvailableQuantity === 1 ? (
                    <span className="text-red-600 flex items-center gap-1.5 animate-pulse font-bold">
                      🔥 Last item available!
                    </span>
                  ) : displayAvailableQuantity <= 5 ? (
                    <span className="text-orange-600 flex items-center gap-1.5 font-semibold">
                      ⚠️ Only {displayAvailableQuantity} left in stock.
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1.5">
                      🔥 Hurry! Only {displayAvailableQuantity} left.
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 relative">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock(product, selectedSize, selectedColor || selectedVariantId) || !selectedSize || isAdding || isAllInCart}
                aria-busy={isAdding}
                className="flex-1 bg-black text-white py-4 px-6 rounded-full font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] shadow-sm active:scale-[0.99]"
              >
                {isAdding ? <LoadingSpinner size="sm" className="text-white" /> : null}
                {isAdding ? 'Adding...' : isAllInCart ? 'All in Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock(product, selectedSize, selectedColor || selectedVariantId) || !selectedSize || isAdding || (isAllInCart && inCartQty === 0)}
                className="flex-1 bg-neutral-900 text-white py-4 px-6 rounded-full font-medium hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-[0.2em] shadow-sm active:scale-[0.99]"
              >
                {isAdding ? 'Adding...' : 'Buy Now'}
              </button>
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
                    isWishlisted ? 'text-red-500 fill-current' : 'text-neutral-400'
                  }`}
                />
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="p-3.5 border border-neutral-200 rounded-full hover:border-neutral-500 hover:text-neutral-700 transition-colors"
                title="Share product"
                aria-label="Share product"
                aria-haspopup="dialog"
                aria-expanded={shareOpen}
              >
                <Share2 className="h-5 w-5 text-neutral-500" />
              </button>

              {/* Share popover */}
              {shareOpen && (
                <div ref={shareRef} role="dialog" aria-label="Share product" className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Share this product</div>
                    <button onClick={() => setShareOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleNativeShare} className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-3">
                      <span className="text-sm">Use device share</span>
                    </button>
                    <button onClick={handleCopyLink} className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-3">
                      <span className="text-sm">Copy product link</span>
                    </button>
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <div className="text-xs text-gray-500 mb-1">Share via</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSocialClick('twitter')} className="px-2 py-1 rounded border hover:bg-gray-50">Twitter</button>
                        <button onClick={() => handleSocialClick('facebook')} className="px-2 py-1 rounded border hover:bg-gray-50">Facebook</button>
                        <button onClick={() => handleSocialClick('whatsapp')} className="px-2 py-1 rounded border hover:bg-gray-50">WhatsApp</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features (Truck, Returns, Secure) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Free Shipping</p>
                  <p className="text-sm text-gray-500">Over Rs 5,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Easy Returns</p>
                  <p className="text-sm text-gray-500">14 days return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Secure Payment</p>
                  <p className="text-sm text-gray-500">100% secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- OPTIMIZED ACCORDION SECTIONS (Details, Shipping, etc.) --- */}
        <div className="max-w-4xl mx-auto mb-16 border-t border-gray-200">
          {/* Details & Care */}
          <AccordionItem
            title="Details & Care"
            isOpen={openSection === 'details'}
            onClick={() => toggleSection('details')}
          >
            <div className="grid gap-y-3">
              {/* Dynamic Design Details from Specifications */}
              {product.specifications && typeof product.specifications === 'object' && Object.entries(product.specifications).map(([key, value]) => {
                // Safely convert value to string
                let displayValue = '';
                if (value !== null && value !== undefined) {
                  if (typeof value === 'object') {
                    // Handle objects and arrays
                    if (Array.isArray(value)) {
                      displayValue = value.map(v => String(v)).join(', ');
                    } else {
                      // Check if it's an object with numeric keys (array-like)
                      const keys = Object.keys(value);
                      const hasNumericKeys = keys.every(k => /^\d+$/.test(k));
                      if (hasNumericKeys) {
                        // Extract values from numeric-keyed object
                        displayValue = Object.values(value).map(v => String(v)).join(', ');
                      } else {
                        // For regular objects, use JSON.stringify or a simple representation
                        try {
                          displayValue = JSON.stringify(value);
                        } catch {
                          displayValue = String(value);
                        }
                      }
                    }
                  } else {
                    displayValue = String(value);
                  }
                }
                
                return (
                  <div key={key} className="grid grid-cols-[160px_1fr] gap-4">
                    <span className="font-bold text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span>{displayValue}</span>
                  </div>
                );
              })}
              
              {/* Style (Category) */}
              <div className="grid grid-cols-[160px_1fr] gap-4">
                <span className="font-bold text-gray-900">Style:</span>
                <span>{String(product.category ?? 'N/A')}</span>
              </div>

              {/* Color */}
              <div className="grid grid-cols-[160px_1fr] gap-4">
                <span className="font-bold text-gray-900">Color:</span>
                <span className="capitalize text-sm font-light text-gray-700">
                  {(() => {
                    try {
                      if (Array.isArray(product.colors) && product.colors.length) {
                        return product.colors.map((c: any) => getColorName(c.name || c.displayName || c.value || c.hex || '')).filter(Boolean).join(', ');
                      }
                      if (Array.isArray((product as any).variants) && (product as any).variants.length) {
                        return (product as any).variants.map((v: any) => getColorName(v.name || v.hex || '')).filter(Boolean).join(', ');
                      }
                    } catch (e) {
                      // ignore
                    }
                    return 'As shown';
                  })()}
                </span>
              </div>

              {/* Size */}
              <div className="grid grid-cols-[160px_1fr] gap-4">
                <span className="font-bold text-gray-900">Size:</span>
                <span className="capitalize text-sm font-light text-gray-700">
                  {(() => {
                    try {
                      const sizes = getDisplaySizesForProduct(product);
                      if (Array.isArray(sizes) && sizes.length) return String(sizes.join(', '));
                    } catch (e) {
                      // ignore
                    }
                    return 'As shown';
                  })()}
                </span>
              </div>

              {(!product.specifications || Object.keys(product.specifications).length === 0) && (
                <div className="text-gray-500 italic">No specific design details available for this product.</div>
              )}
            </div>
          </AccordionItem>

          {/* Shipping & Deliveries */}
          <AccordionItem
            title="Shipping & Deliveries"
            isOpen={openSection === 'shipping'}
            onClick={() => toggleSection('shipping')}
          >
            <p>
              A shipping fee of <span className="font-medium text-gray-900">Rs.300</span> is applicable on all orders. All orders may take up to <span className="font-medium text-gray-900">3 - 5</span> working days to be delivered. All Lahore Orders would be delivered within <span className="font-medium text-gray-900">48</span> hours of the order being placed. If Lahore orders are not delivered within <span className="font-medium text-gray-900">48</span> hours, please contact our customer support or message us.
            </p>
          </AccordionItem>

          {/* Return & Exchange */}
          <AccordionItem
            title="Return & Exchange"
            isOpen={openSection === 'returns'}
            onClick={() => toggleSection('returns')}
          >
            <p className="mb-2">
              Non-sale Product(s) can be exchanged from any of our retail stores within <span className="font-medium text-gray-900">14</span> days from the date of delivery. If the time has exceeded <span className="font-medium text-gray-900">14</span> days, then exchange is not possible.
            </p>
            <p>
              Denfit does not offer a "returned or money back guarantee".
            </p>
          </AccordionItem>

          {/* Disclaimer */}
          <AccordionItem
            title="Disclaimer"
            isOpen={openSection === 'disclaimer'}
            onClick={() => toggleSection('disclaimer')}
          >
            <p>
              Colors may vary slightly due to screen settings and lighting, and minor variations in fabric or finish may occur. Sizing can differ slightly depending on design and materials, so please refer to the size chart for best fit. To ensure longevity, follow the care instructions provided with each item.
            </p>
          </AccordionItem>
        </div>

        {/* --- DEDICATED REVIEW SECTION --- */}
        <div ref={reviewsRef} className="max-w-7xl mx-auto border-t border-gray-200 pt-16 mb-20 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
               <span className="text-yellow-400 font-bold text-xl">★</span>
               <span className="font-bold text-lg">{displayRating !== null ? displayRating.toFixed(1) : 'No rating'}</span>
               <span className="text-gray-500">Based on verified reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Write Review (Gated by Login) */}
            <div className="lg:col-span-4">
              <div className="bg-gray-50 p-6 rounded-2xl sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Share your thoughts</h3>
                <p className="text-sm text-gray-600 mb-6">If you've used this product, share your thoughts with other customers</p>
                
                {user ? (
                   /* Authenticated: Show Form */
                   <ReviewForm 
                     productId={String(product.id || product._id)} 
                     onSubmitted={(r) => { setReviewsRefreshKey(k => k + 1); setPrependReview(r); showToast('Review submitted successfully!', 'success'); }} 
                   />
                ) : (
                   /* Unauthenticated: Show Login Prompt */
                   <div className="border border-gray-200 bg-white rounded-xl p-6 text-center shadow-sm">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-5 h-5 text-gray-500" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Please log in to write a review</h4>
                      <p className="text-sm text-gray-500 mb-4">Only registered customers can write reviews for this product.</p>
                      <Link 
                        to="/auth?mode=login" 
                        state={{ from: location }} // Helps redirect back here after login
                        className="inline-flex justify-center items-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors"
                      >
                        Log In
                      </Link>
                   </div>
                )}
              </div>
            </div>

            {/* Right Column: Review List */}
            <div className="lg:col-span-8">
              <ReviewList productId={String(product.id || product._id)} refreshKey={reviewsRefreshKey} prependReview={prependReview} />
            </div>
          </div>
        </div>

        {/* Recommendations: You Might Also Like */}
        <div className="mt-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900">You Might Also Like</h3>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-start">
              {(product.relatedProducts || []).slice(0, 4).map((rp: any) => {
                const rpId = String(rp._id || rp.id || '');
                const rpImage = rp.images && rp.images[0] ? (typeof rp.images[0] === 'string' ? rp.images[0] : rp.images[0].url) : '';
                return (
                  <Link key={rpId} to={`/product/${rpId}`} className="group border border-gray-100 rounded-xl overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 bg-white">
                    <div className="w-full h-48 bg-gray-50 overflow-hidden relative">
                      <img 
                        src={String(rpImage)} 
                        alt={String(rp.name || '')} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="font-semibold text-gray-900 mb-1 line-clamp-2">{String(rp.name ?? '')}</div>
                      <div className="text-blue-600 font-medium mt-auto">Rs {typeof rp.price === 'number' ? rp.price.toLocaleString() : String(rp.price ?? '')}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recently Viewed Products */}
        {recentlyViewedList.length > 0 && (
          <div className="mt-20 mb-10">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900">Recently Viewed</h3>
            </div>
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {recentlyViewedList.map((p: any) => (
                  <Link
                    key={String(p.id || p._id || '')}
                    to={`/product/${String(p.id || p._id || '')}`}
                    className="group border border-gray-100 rounded-lg overflow-hidden p-2 flex flex-col items-start hover:shadow-lg transition-all bg-white"
                  >
                    <div className="w-full h-32 bg-gray-50 overflow-hidden mb-2 rounded-md">
                      <img
                        src={String(p.image || '')}
                        alt={String(p.name || '')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="text-sm font-medium truncate w-full text-gray-900 group-hover:text-blue-600 transition-colors">
                      {String(p.name ?? '')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Rs {typeof p.price === 'number' ? p.price.toLocaleString() : String(p.price ?? '')}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <SizeGuide
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        image={String(product.sizeGuide?.image ?? '')}
        description={String(product.sizeGuide?.description ?? '')}
        tableHtml={String(product.sizeGuide?.tableHtml ?? '')}
      />
    </div>
  );
};

export default ProductDetail;