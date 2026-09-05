import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ArrowRight, Sparkles } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { FilterEngine } from '../components/FilterEngine';
import { productsAPI } from '../api';
import { usePageBanner } from '../hooks/usePageBanner';

type AnyProduct = Record<string, any>;
type AnyFilters = Record<string, any>;

function FragrancesHero() {
  const { banner } = usePageBanner('fragrances');
  const imageUrl =
    banner?.imageUrl ||
    (banner as any)?.image ||
    'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=1600&auto=format&fit=crop';
  const title = banner?.title || 'THE FRAGRANCE COLLECTION';
  const subtitle =
    banner?.subtitle ||
    'Discover signature scents, rare perfumes, and timeless colognes crafted with exquisite sophistication';
  const buttonLink = banner?.link || '#fragrances-grid';
  const buttonText = banner?.buttonText || 'Explore Scents';

  return (
    <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-8 md:mb-12">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold tracking-widest uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>DENFiT Haute Parfumerie</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase leading-tight">
              {title}
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8 font-light leading-relaxed">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={buttonLink}
                className="inline-block bg-white text-black px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors shadow-sm"
              >
                {buttonText}
              </a>
              <Link
                to="/shop?sort=newest"
                className="inline-block border-2 border-white text-white px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-white hover:text-black transition-colors"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE_TABS = [
  { label: 'All Fragrances', value: 'all' },
  { label: "Men's Fragrances", value: 'men' },
  { label: "Women's Fragrances", value: 'women' },
  { label: "Kids' Scents", value: 'kids' },
  { label: 'Unisex', value: 'unisex' },
];

export default function Fragrances(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<AnyFilters>({});

  // Active gender filter from URL query param or tab state
  const genderParam = (searchParams.get('gender') || 'all').toLowerCase();
  const [activeTab, setActiveTab] = useState<string>(
    ['all', 'men', 'women', 'kids', 'unisex'].includes(genderParam) ? genderParam : 'all'
  );

  // Sync tab with URL parameter if it changes
  useEffect(() => {
    const g = (searchParams.get('gender') || 'all').toLowerCase();
    if (['all', 'men', 'women', 'kids', 'unisex'].includes(g)) {
      setActiveTab(g);
    }
  }, [searchParams]);

  // Load active brands and available volume variants
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [brandsRes, facetsRes]: [any, any] = await Promise.all([
          productsAPI.getBrands(),
          productsAPI.getFilters(),
        ]);
        if (!mounted) return;

        const brandList =
          (brandsRes && (brandsRes.data || brandsRes.brands)) || (Array.isArray(brandsRes) ? brandsRes : []);
        if (Array.isArray(brandList)) {
          setBrands(brandList.filter(Boolean));
        }

        const facets = (facetsRes && (facetsRes.data || facetsRes)) || {};
        if (Array.isArray(facets.sizes)) {
          // Volume sizes like 30 ml, 50 ml, 100 ml, etc.
          const volumes = facets.sizes.map((s: any) => String(s)).filter(Boolean);
          setAvailableSizes(volumes);
        }
      } catch (err) {
        console.error('Failed to load fragrance facets', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch fragrance products
  const fetchFragranceProducts = async (genderFilter: string, filters: AnyFilters = {}) => {
    try {
      setLoading(true);

      const params: Record<string, any> = {
        limit: 100,
        category: 'fragrances',
      };

      if (genderFilter !== 'all') {
        params.gender = genderFilter;
      }

      if (filters.brand) {
        params.brand = filters.brand;
      }
      if (filters.sizes && Array.isArray(filters.sizes) && filters.sizes.length) {
        params.sizes = filters.sizes;
      }
      if (filters.priceRange) {
        params.maxPrice = filters.priceRange;
      }
      if (filters.rating) {
        params.rating = filters.rating;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.sort) {
        params.sort = filters.sort;
      }

      const res: any = await productsAPI.getAll(params);
      const items = (res && (res.data?.products || res.products)) || [];
      const normalized = items.map((p: AnyProduct) => ({
        ...(p || {}),
        id: p?.id || p?._id || p?.slug || '',
      }));

      setProducts(normalized);
      setTotal(normalized.length);
    } catch (err) {
      console.error('Failed to load fragrance products', err);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load whenever tab or filters change
  useEffect(() => {
    fetchFragranceProducts(activeTab, currentFilters);
  }, [activeTab, currentFilters]);

  // Tab change handler
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val === 'all') {
      nextParams.delete('gender');
    } else {
      nextParams.set('gender', val);
    }
    setSearchParams(nextParams);
  };

  // Brand count calculation for fragrance items
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.brand) {
        const b = String(p.brand).trim();
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filter apply handler
  const handleApplyFilters = (filters: AnyFilters) => {
    setCurrentFilters(filters);
  };

  return (
    <div className="w-full bg-white text-gray-900 min-h-screen">
      {/* Luxury Hero Banner */}
      <FragrancesHero />

      <div id="fragrances-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Audience / Department Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8 gap-4 overflow-x-auto">
          <div className="flex items-center gap-2">
            {AUDIENCE_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`px-4 py-2 text-xs md:text-sm font-semibold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-medium hover:border-black transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{showFilters ? 'Hide Filters' : 'Filter & Sort'}</span>
          </button>
        </div>

        {/* Brand Highlights Bar */}
        {brands.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                Featured Perfume Houses
              </span>
              <span className="text-xs text-gray-400">{total} Fragrances Available</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => handleApplyFilters({ ...currentFilters, brand: undefined })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase border transition-colors shrink-0 ${
                  !currentFilters.brand
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                }`}
              >
                All Brands
              </button>
              {brands.map((b) => {
                const isSelected = String(currentFilters.brand || '').toLowerCase() === b.toLowerCase();
                const count = brandCounts[b] || 0;
                return (
                  <button
                    key={b}
                    onClick={() =>
                      handleApplyFilters({
                        ...currentFilters,
                        brand: isSelected ? undefined : b,
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase border transition-colors shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span>{b}</span>
                    {count > 0 && (
                      <span className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Drawer / Sidebar if open */}
        {showFilters && (
          <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-900">Refine Collection</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-black p-1"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterEngine
              colors={[]}
              sizes={availableSizes.length > 0 ? availableSizes : ['30 ml', '50 ml', '75 ml', '100 ml', '150 ml', '200 ml']}
              onFilterChange={handleApplyFilters}
            />
          </div>
        )}

        {/* Product Grid / Loading / Empty States */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 py-12">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl aspect-[3/4] mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Fragrances Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {currentFilters.brand || activeTab !== 'all'
                ? 'Try broadening your search or resetting active filters.'
                : 'No fragrance products have been published in this collection yet.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(currentFilters.brand || activeTab !== 'all') && (
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setCurrentFilters({});
                    setSearchParams({});
                  }}
                  className="px-6 py-2.5 bg-black text-white text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
              <Link
                to="/shop"
                className="px-6 py-2.5 border border-gray-300 text-gray-700 text-xs uppercase font-semibold tracking-wider rounded-lg hover:border-black transition-colors"
              >
                Browse Full Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product as any}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
