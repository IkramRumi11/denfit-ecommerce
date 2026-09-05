// frontend/src/pages/Shop.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid, List, SlidersHorizontal,
  X, Search
} from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { FilterEngine } from '../components/FilterEngine';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
// mockProducts intentionally not used in production search — rely on backend
import { useLocation, useNavigate } from 'react-router-dom';
import { slugify, primaryImage, canonicalProductId, resolveProductSelection } from '../utils/productHelpers';
import { isOutOfStock, getAvailableStockForItem } from '../utils/stockHelpers';
import megaMenuData from '../data/megaMenuData';
import { productsAPI } from '../api';

export const Shop: React.FC = () => {
  // --- STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const scrollYRef = useRef<number>(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();

  // Quick-add modal state (open selection modal before adding)
  const [quickAddProduct, setQuickAddProduct] = useState<any | null>(null);

  // --- LOGIC: CART ---
  const openQuickAdd = (product: any) => {
    if (!product || isOutOfStock(product)) {
      showToast('Product is out of stock', 'error');
      return;
    }
    setQuickAddProduct(product);
  };

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
        price: product.price,
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
          showToast(`You already have all ${availableStock} available units in your cart`, 'warning');
        } else {
          showToast('Product is out of stock', 'error');
        }
        return;
      }

      showToast(`${product.name} added to the cart`, 'success');
      closeQuickAdd();
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };
  // --- LOGIC: FILTERS (handled by FilterEngine) ---
  const handleProductsFromEngine = (prods: any[]) => {
    setProducts(prods);
    setFilteredProducts(prods);
  };

  const handleResetFilters = () => {
    navigate('/shop', { replace: true });
    setLoading(true);
    productsAPI.getAll({}).then((res: any) => {
      const items = (res && (res.products || res.data?.products)) || [];
      const normalized = items.map((p: any) => ({ ...(p || {}), id: p.id || p._id || p.slug || '' }));
      setProducts(normalized);
      setFilteredProducts(normalized);
    }).catch((err: any) => {
      console.error('Failed to reload products', err);
    }).finally(() => {
      setLoading(false);
    });
  };

  // --- LOGIC: URL PARAMS ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const genderParam = params.get('gender');
    const typeParam = params.get('type');
    const brandParam = params.get('brand') || params.get('brandSlug');
    const colorParam = params.get('color');
    const searchParam = params.get('search');
    const sizesParam = params.get('sizes');
    const priceParam = params.get('price');
    const ratingParam = params.get('rating');
    if (!genderParam && !typeParam && !brandParam && !colorParam && !sizesParam && !priceParam && !ratingParam && !searchParam) return;

    let filtered = [...products];

    const normalize = (v: any) => slugify(String(v || '') || '');

    const genderMatches = (prodGender: any, paramGender: string | null) => {
      if (!prodGender || !paramGender) return false;
      const p = normalize(prodGender);
      const g = normalize(paramGender);
      if (p === g) return true;
      const groups: { [k: string]: string[] } = {
        men: ['men', 'male', 'man', 'm'],
        women: ['women', 'female', 'woman', 'f'],
        kids: ['kids', 'children', 'boys', 'girls', 'kid']
      };
      for (const key of Object.keys(groups)) {
        if (groups[key].includes(g) && groups[key].includes(p)) return true;
      }
      return p.startsWith(g) || g.startsWith(p);
    };

    const isGenderSale = String(genderParam || '').toLowerCase() === 'sale';
    if (!isGenderSale && genderParam) {
      // Request server-side filtering by gender
      const q: any = { gender: genderParam };
      if (typeParam) q.category = typeParam;
      if (brandParam) q.brand = brandParam;
      productsAPI.getAll(q).then((res: any) => {
        const items = (res && (res.products || res.data?.products)) || [];
        const normalized = items.map((p: any) => ({ ...(p || {}), id: p.id || p._id || p.slug || '' }));
        setProducts(normalized);
        setFilteredProducts(normalized);
      }).catch((err: any) => console.error('Failed to load products for gender filter', err));
    } else if (brandParam && !genderParam) {
      // Request server-side filtering by brand
      const q: any = { brand: brandParam };
      if (typeParam) q.category = typeParam;
      productsAPI.getAll(q).then((res: any) => {
        const items = (res && (res.products || res.data?.products)) || [];
        const normalized = items.map((p: any) => ({ ...(p || {}), id: p.id || p._id || p.slug || '' }));
        setProducts(normalized);
        setFilteredProducts(normalized);
      }).catch((err: any) => console.error('Failed to load products for brand filter', err));
    }

    // Filter by brand client-side as well
    if (brandParam && String(brandParam).trim()) {
      const bNorm = normalize(brandParam);
      filtered = filtered.filter((p: any) => {
        if (!p.brand) return false;
        const pbNorm = normalize(p.brand);
        return pbNorm === bNorm || pbNorm.includes(bNorm) || bNorm.includes(pbNorm) || (p.brandSlug && normalize(p.brandSlug) === bNorm);
      });
    }

    if (typeParam) {
      let decoded = typeParam;
      try {
        decoded = decodeURIComponent(typeParam as string);
      } catch (err) {
        decoded = typeParam as string;
      }

      const decodedLower = String(decoded).toLowerCase();
      const saleLike = (genderParam === 'sale') || /up[- ]?to|%|off|discount|clearance/.test(decodedLower);

      if (saleLike) {
        // helper: compute discount percent for a product
        const productDiscount = (prod: any) => {
          if (typeof prod.discountPercentage === 'number') return Number(prod.discountPercentage) || 0;
          const orig = prod.originalPrice || prod.compareAtPrice || prod.original_price;
          const p = prod.price || 0;
          if (orig && Number(orig) > Number(p)) {
            const pct = Math.round(((Number(orig) - Number(p)) / Number(orig)) * 100);
            return Number.isFinite(pct) ? pct : 0;
          }
          return 0;
        };

        // extract numeric threshold (e.g., 30 from "up to 30%") if present
        let threshold: number | null = null;
        const threshMatch = decodedLower.match(/(\d{1,3})\s*%?/);
        if (threshMatch) threshold = parseInt(threshMatch[1], 10);

        // detect whether the phrase is "up to X" (inclusive <=) or a "min X%" intent (>=)
        const isUpTo = /up[- ]?to|upto/.test(decodedLower);

        // extract category text before sale phrase (e.g., "accessories")
        const cleanedForCategory = decodedLower.replace(/-/g, ' ');
        let categoryPart = cleanedForCategory.split(/up[- ]?to|off|%|discount|clearance/)[0].trim();
        if (categoryPart === '') categoryPart = cleanedForCategory;
        const catTarget = normalize(categoryPart);

        // Expand high-level sale categories (e.g., "accessories") to include their sub-items
        const expandedTargets: string[] = [catTarget];
        try {
          const menuEntry = (megaMenuData as any)[catTarget];
          if (menuEntry && menuEntry.categories) {
            Object.values(menuEntry.categories).forEach((arr: any) => {
              if (Array.isArray(arr)) {
                arr.forEach((it: any) => {
                  if (it) expandedTargets.push(normalize(it));
                });
              }
            });
          }
        } catch (e) {
          // ignore if megaMenuData isn't present or mapping fails
        }

        filtered = filtered.filter((p: any) => {
          const disc = productDiscount(p);
          if (threshold !== null) {
            if (isUpTo) {
              if (!(disc > 0 && disc <= threshold)) return false;
            } else {
              if (disc < threshold) return false;
            }
          }

          // if categoryPart is generic sale, accept any sale product
          const genericSaleWords = ['sale','clearance','last season','final reductions','special offers','offers','discounts'];
          if (genericSaleWords.some(w => categoryPart.includes(w))) {
            return disc > 0 || p.isOnSale || p.onSale || p.category === 'sale' || p.gender === 'sale';
          }

          // otherwise require category/type matching — allow expandedTargets (e.g., accessories -> wallets, watches)
          const candidates = [p.category, p.subcategory, p.subCategory, p.type, p.section];
          if (Array.isArray(p.tags)) candidates.push(...p.tags);
          if (Array.isArray(p.colors)) candidates.push(...p.colors);

          const matchTarget = (value: any) => {
            if (!value) return false;
            if (Array.isArray(value)) {
              return value.map(String).some(x => expandedTargets.includes(normalize(x)));
            }
            try {
              if (expandedTargets.includes(normalize(value))) return true;
            } catch (e) {}
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.map(String).some((x: any) => expandedTargets.includes(normalize(x)))) return true;
              } catch (e) {
                // ignore
              }
            }
            return false;
          };

          for (const c of candidates.filter(Boolean)) {
            if (matchTarget(c)) return true;
          }

          // fallback: allow match on product name
          if (normalize(p.name) && expandedTargets.includes(normalize(p.name))) return true;
          return false;
        });
      } else {
        const target = normalize(decoded);
        const targetSingular = target.endsWith('s') && target.length > 2 ? target.slice(0, -1) : target;
        filtered = filtered.filter((p: any) => {
          const candidates = [p.category, p.subcategory, p.subCategory, p.type, p.section, p.name];
          if (Array.isArray(p.tags)) candidates.push(...p.tags);
          if (Array.isArray(p.colors)) candidates.push(...p.colors);

          for (const c of candidates.filter(Boolean)) {
            const normC = normalize(c);
            if (normC === target || normC === targetSingular) return true;
            if (normC.includes(target) || normC.includes(targetSingular) || target.includes(normC)) return true;
            if (Array.isArray(c)) {
              if ((c as any[]).map(String).some((x: any) => {
                const nx = normalize(x);
                return nx === target || nx === targetSingular || nx.includes(targetSingular);
              })) return true;
            }
            if (typeof c === 'string') {
              try {
                const parsed = JSON.parse(c as string);
                if (Array.isArray(parsed) && parsed.map(String).some((x: any) => {
                  const nx = normalize(x);
                  return nx === target || nx === targetSingular || nx.includes(targetSingular);
                })) return true;
              } catch (e) {
                // ignore
              }
            }
          }
          return false;
        });
      }
    } else if (isGenderSale) {
      // Special-case: /shop?gender=sale should show all sale/discounted products
      const productDiscount = (prod: any) => {
        if (typeof prod.discountPercentage === 'number') return Number(prod.discountPercentage) || 0;
        const orig = prod.originalPrice || prod.compareAtPrice || prod.original_price;
        const p = prod.price || 0;
        if (orig && Number(orig) > Number(p)) {
          const pct = Math.round(((Number(orig) - Number(p)) / Number(orig)) * 100);
          return Number.isFinite(pct) ? pct : 0;
        }
        return 0;
      };

      filtered = filtered.filter((p: any) => {
        const disc = productDiscount(p);
        return disc > 0 || p.isOnSale || p.onSale || p.category === 'sale' || p.gender === 'sale';
      });
    }

    if (colorParam && String(colorParam).trim() !== '') {
      const needle = String(colorParam).toLowerCase();
      const matchesColor = (product: any) => {
        if (Array.isArray(product.variants)) {
          for (const v of product.variants) {
            const name = (v && (v.name || v.displayName || v.value) || '').toString().toLowerCase();
            const hex = (v && (v.hex || v.normalizedHex || v.value) || '').toString().toLowerCase();
            if (name === needle || hex === needle) return true;
          }
        }
        if (Array.isArray(product.colors)) {
          for (const c of product.colors) {
            const name = (c && (c.name || c.displayName || c.value) || '').toString().toLowerCase();
            const hex = (c && (c.hex || c.normalizedHex || c.value) || '').toString().toLowerCase();
            if (name === needle || hex === needle) return true;
          }
        }
        if (product.color) {
          const pcol = String(product.color).toLowerCase();
          if (pcol === needle) return true;
        }
        return false;
      };
      filtered = filtered.filter(matchesColor);
    }
    // Apply text search across name/description/tags/brand when present
    if (searchParam && String(searchParam).trim() !== '') {
      const q = String(searchParam).toLowerCase();
      filtered = filtered.filter((p: any) => {
        try {
          if (p.name && String(p.name).toLowerCase().includes(q)) return true;
          if (p.brand && String(p.brand).toLowerCase().includes(q)) return true;
          if (p.description && String(p.description).toLowerCase().includes(q)) return true;
          if (Array.isArray(p.tags) && p.tags.map(String).some((t: any) => String(t).toLowerCase().includes(q))) return true;
          if (p.sku && String(p.sku).toLowerCase().includes(q)) return true;
          return false;
        } catch (e) { return false; }
      });
    }
    // Build parsedFilters to initialize filter UI
    const parsedFilters: any = {};
    if (typeParam) parsedFilters.category = typeParam;
    if (brandParam) parsedFilters.brand = brandParam;
    if (colorParam) parsedFilters.color = colorParam;
    if (searchParam) parsedFilters.search = searchParam;
    if (sizesParam) parsedFilters.sizes = String(sizesParam).split(',').map(s => s.trim()).filter(Boolean);
    if (priceParam && !Number.isNaN(Number(priceParam))) parsedFilters.priceRange = Number(priceParam);
    if (ratingParam && !Number.isNaN(Number(ratingParam))) parsedFilters.rating = Number(ratingParam);

    setCurrentFilters(parsedFilters);
    setFilteredProducts(filtered);
  }, [location.search, products]);

  // --- FETCH PRODUCTS FROM API ---
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    productsAPI
      .getAll({ limit: 1000 })
      .then((res: any) => {
        // Backend responses are wrapped: { success: true, data: { products, pagination } }
        // Support both shapes for resilience: top-level `products` or `data.products`.
        const items = (res && (res.products || res.data?.products)) || [];
        // Normalize id field (some API responses use _id)
        const normalized = items.map((p: any) => ({ ...(p || {}), id: p.id || p._id || p.slug || '' }));
        if (!mounted) return;
        setProducts(normalized);
        setFilteredProducts(normalized);
      })
      .catch((err: any) => {
        console.error('Failed to load products', err);
        if (!mounted) return;
        setError(err?.message || 'Failed to load products');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // compute available colors from all products for the filters UI
  const availableColors = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      if (Array.isArray(product.variants)) {
        product.variants.forEach((v: any) => {
          const name = v && (v.name || v.displayName || v.value);
          const hex = v && (v.hex || v.normalizedHex || v.value);
          if (name) set.add(String(name));
          if (hex) set.add(String(hex));
        });
      }
      if (Array.isArray(product.colors)) {
        product.colors.forEach((c: any) => {
          const name = c && (c.name || c.displayName || c.value);
          const hex = c && (c.hex || c.normalizedHex || c.value);
          if (name) set.add(String(name));
          if (hex) set.add(String(hex));
        });
      }
    });
    return Array.from(set);
  }, [products]);

  // compute sizes available across products
  const availableSizes = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      if (Array.isArray(product.sizes)) {
        product.sizes.forEach((s: any) => set.add(String(s)));
      }
      if (Array.isArray(product.sizesObjects)) {
        product.sizesObjects.forEach((s: any) => set.add(String(s.value || s)));
      }
    });
    return Array.from(set);
  }, [products]);

  const bodyStyleRef = useRef<{
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
    overflow: string;
    paddingRight: string;
    htmlOverflow: string;
  } | null>(null);

  // --- BODY SCROLL LOCK FOR FILTER DRAWER ---
  useEffect(() => {
    const lockScroll = () => {
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
      bodyStyleRef.current = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
        htmlOverflow: document.documentElement.style.overflow,
      };

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        const existingPadding = document.body.style.paddingRight || '0px';
        document.body.style.paddingRight = existingPadding === ''
          ? `${scrollBarWidth}px`
          : `calc(${existingPadding} + ${scrollBarWidth}px)`;
      }

      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    };

    const unlockScroll = () => {
      if (bodyStyleRef.current) {
        document.body.style.position = bodyStyleRef.current.position;
        document.body.style.top = bodyStyleRef.current.top;
        document.body.style.left = bodyStyleRef.current.left;
        document.body.style.right = bodyStyleRef.current.right;
        document.body.style.width = bodyStyleRef.current.width;
        document.body.style.overflow = bodyStyleRef.current.overflow;
        document.body.style.paddingRight = bodyStyleRef.current.paddingRight;
        document.documentElement.style.overflow = bodyStyleRef.current.htmlOverflow;
      } else {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
      }

      if (scrollYRef.current !== 0) {
        window.scrollTo(0, scrollYRef.current);
        scrollYRef.current = 0;
      }
    };

    if (showFilters) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [showFilters]);

  return (
    <div className="bg-white text-black min-h-screen selection:bg-emerald-500/30">
      
      {/* 1. MINIMALIST HERO */}
      <section className="relative h-[40vh] lg:h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070" 
            className="w-full h-full object-cover opacity-40 scale-105"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-6"
        >
          <span className="text-emerald-400 text-xs uppercase tracking-[0.32em] mb-4 block">New Season 2026</span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-[0.2em] mb-4">
            DENFiT
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base tracking-wide">
            Curated pieces designed with architectural precision. 
            <br />Refining the modern silhouette for the discerning user.
          </p>
        </motion.div>
      </section>

      {/* 2. STICKY CONTROL BAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-3 group hover:text-emerald-400 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              <span className="text-xs uppercase tracking-[0.26em] font-normal">Refine</span>
            </button>
            <div className="hidden md:block h-4 w-px bg-white/10" />
            <span className="hidden md:block text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              {filteredProducts.length} Items Found
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/50 p-1 rounded-full border border-gray-200">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 sm:py-40 text-center">
              <h2 className="text-3xl md:text-4xl font-light tracking-[0.2em] mb-2">LOADING...</h2>
              <p className="text-zinc-500">Fetching products from the store...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <motion.div 
              layout
              className={`grid ${
                    viewMode === "grid" 
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" 
                      : "grid-cols-1 gap-3 md:gap-4"
                  }`}
            >
              {filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  {viewMode === 'grid' ? (
                     <>
                       <ProductCard 
                         product={product} 
                         onAddToCart={(/* size, color */) => openQuickAdd(product)}
                       />
                       {/* QuickView modal opened by Shop to require selection before adding */}
                     </>
                  ) : (
                    <div className="flex flex-row bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-all">
                      <div className="w-32 sm:w-48 relative">
                        <img 
                          src={primaryImage(product)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                          {/* Tags */}
                          {(() => {
                            const normalizeTags = (input:any): string[] => {
                              if (!input) return [];
                              if (Array.isArray(input)) return input.map(String).map(s=>s.trim()).filter(Boolean);
                              if (typeof input === 'string') {
                                try { let s = input; for (let i=0;i<5;i++) { const parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed.flatMap((x:any)=> typeof x === 'string' ? x : String(x)).map(String).map(s=>s.trim()).filter(Boolean); if (typeof parsed === 'string') { s = parsed; continue; } return [String(parsed)]; } } catch(e) {}
                                if (input.includes(',')) return input.split(',').map((x:string)=>x.trim()).filter(Boolean);
                                return [input.replace(/^['`"]+|['`"]+$/g,'').trim()].filter(Boolean);
                              }
                              return [String(input)];
                            };
                            const tags = normalizeTags(product.tags || []);
                            if (!tags.length) return null;
                            return <div className="flex gap-2 mt-2 flex-wrap">{tags.slice(0,4).map((t:any,i:number)=>(<span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>))}</div>;
                          })()}
                          <div className="mt-2 font-bold text-emerald-400">Rs {product.price.toLocaleString()}</div>
                        </div>
                        <button 
                          onClick={() => openQuickAdd(product)}
                          className="mt-4 self-start px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-[0.26em] hover:bg-emerald-400 transition-colors"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-12 sm:py-24 text-center px-4">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-light tracking-[0.16em] mb-2 uppercase">
                {new URLSearchParams(location.search).get('search') || new URLSearchParams(location.search).get('q')
                  ? 'No Related Products Available'
                  : 'No Matches Found'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                {new URLSearchParams(location.search).get('search') || new URLSearchParams(location.search).get('q')
                  ? 'No related products available. Try a different search.'
                  : "We couldn't find any products matching your filters. Try adjusting or resetting them."}
              </p>
              <button 
                onClick={handleResetFilters}
                className="px-5 py-2.5 sm:px-6 sm:py-2.5 bg-white text-black text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] hover:bg-emerald-400 transition-colors rounded-lg shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* 4. FILTER DRAWER — Powered by FilterEngine */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
            />
            
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl border-l border-gray-200 flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-wide text-gray-900">Filters</h2>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <FilterEngine
                  onProductsChange={handleProductsFromEngine}
                  onLoadingChange={setLoading}
                  headless={false}
                  inline={true}
                  showHeader={false}
                />
              </div>

              <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-200">
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold uppercase tracking-[0.2em] transition-all rounded-xl"
                >
                  View {filteredProducts.length} Items
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      {/* QuickViewModal used as quick-add selection for grid/list actions */}
      <QuickViewModal
        product={quickAddProduct}
        isOpen={!!quickAddProduct}
        onClose={closeQuickAdd}
        onAddToCart={(size: string, color?: string) => {
          if (quickAddProduct) performAddToCart(quickAddProduct, size, color);
        }}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Shop;
