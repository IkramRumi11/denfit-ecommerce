import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, Sparkles, Tag, ArrowRight } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { FilterEngine } from '../components/FilterEngine';
import { productsAPI } from '../api';

type AnyProduct = Record<string, any>;
type AnyFilters = Record<string, any>;

export default function Brands(): JSX.Element {
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<AnyFilters>({});
  const location = useLocation();
  const navigate = useNavigate();

  // Load active brands and branded products
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const [brandsRes, facetsRes, productsRes]: [any, any, any] = await Promise.all([
          productsAPI.getBrands(),
          productsAPI.getFilters(),
          productsAPI.getAll({ limit: 100 }),
        ]);

        if (!mounted) return;

        const brandList = (brandsRes && (brandsRes.data || brandsRes.brands)) || (Array.isArray(brandsRes) ? brandsRes : []);
        if (Array.isArray(brandList)) {
          setBrands(brandList.filter(Boolean));
        }

        const facets = (facetsRes && (facetsRes.data || facetsRes)) || {};
        if (Array.isArray(facets.colors)) {
          setAvailableColors(facets.colors.map((c: any) => String(c)).filter(Boolean));
        }
        if (Array.isArray(facets.sizes)) {
          setAvailableSizes(facets.sizes.map((s: any) => String(s)).filter(Boolean));
        }

        const items = (productsRes && (productsRes.data?.products || productsRes.products)) || [];
        const normalized = items
          .filter((p: AnyProduct) => !!p.brand)
          .map((p: AnyProduct) => ({
            ...(p || {}),
            id: p?.id || p?._id || p?.slug || '',
          }));

        setProducts(normalized);
        setTotal(normalized.length);
      } catch (err) {
        console.error('Failed to load brands data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Compute product count per brand
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

  // Filter products by selected brand tab
  const displayedProducts = useMemo(() => {
    if (selectedBrand === 'all') return products;
    return products.filter((p) => String(p.brand || '').toLowerCase() === selectedBrand.toLowerCase());
  }, [products, selectedBrand]);

  const handleProductsChange = (nextProducts: AnyProduct[]) => {
    const brandedOnly = (nextProducts || []).filter((p) => !!p.brand);
    setProducts(brandedOnly);
    setTotal(brandedOnly.length);
  };

  const applyFiltersAndSyncUrl = async (filters: AnyFilters) => {
    setCurrentFilters(filters);

    try {
      const params: any = { limit: 100 };

      if (selectedBrand !== 'all') {
        params.brand = selectedBrand;
      }
      if (filters?.sizes && Array.isArray(filters.sizes) && filters.sizes.length) {
        params.sizes = filters.sizes;
      }
      if (filters?.color) {
        params.colors = filters.color;
      }
      if (filters?.priceRange) {
        params.maxPrice = filters.priceRange;
      }
      if (filters?.rating) {
        params.rating = filters.rating;
      }
      if (filters?.search) {
        params.search = filters.search;
      }

      const res: any = await productsAPI.getAll(params);
      const items = (res && (res.data?.products || res.products)) || [];
      const normalized = items
        .filter((p: AnyProduct) => !!p.brand)
        .map((p: AnyProduct) => ({
          ...(p || {}),
          id: p?.id || p?._id || p?.slug || '',
        }));

      setProducts(normalized);
      setTotal(normalized.length);
    } catch (err) {
      console.error('Brand filter request failed', err);
    }
  };

  return (
    <div className="w-full bg-white text-gray-900 min-h-screen">
      {/* Hero Banner */}
      <section className="relative w-full bg-black text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>Official Brand Partners</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight uppercase">
            Featured Brands
          </h1>
          <p className="mt-4 text-sm md:text-base text-gray-300 max-w-2xl mx-auto">
            Explore authentic collections from world-renowned labels and premium creators.
          </p>
        </div>
      </section>

      {/* Brand Tiles Carousel / Grid */}
      {brands.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider">
                Browse By Brand
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Select a brand to view dedicated collections</p>
            </div>
            <Link
              to="/shop"
              className="text-xs font-semibold text-gray-700 hover:text-black flex items-center gap-1 group"
            >
              <span>Shop Full Catalog</span>
              <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setSelectedBrand('all')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedBrand === 'all'
                  ? 'border-black bg-black text-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-400 text-gray-900'
              }`}
            >
              <div className="text-sm font-bold truncate">All Brands</div>
              <div className={`text-xs mt-1 ${selectedBrand === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>
                {products.length} Products
              </div>
            </button>

            {brands.map((brandName) => {
              const isSelected = selectedBrand.toLowerCase() === brandName.toLowerCase();
              const count = brandCounts[brandName] || 0;
              return (
                <button
                  key={brandName}
                  onClick={() => setSelectedBrand(isSelected ? 'all' : brandName)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-400 text-gray-900'
                  }`}
                >
                  <div className="text-sm font-bold truncate uppercase">{brandName}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {count > 0 ? `${count} Product${count > 1 ? 's' : ''}` : 'View Collection'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Listing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Controls Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <span className="text-sm text-gray-500 font-medium">
              Showing <span className="font-semibold text-gray-900">{displayedProducts.length}</span> {selectedBrand === 'all' ? 'branded' : selectedBrand} products
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="flex gap-8 mt-6">
          {/* Filter Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
            <div className="sticky top-24 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <span className="font-bold text-sm uppercase tracking-wider">Filters</span>
                {showFilters && (
                  <button onClick={() => setShowFilters(false)} className="lg:hidden p-1 text-gray-400 hover:text-black">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <FilterEngine
                categorySlug="brands"
                currentFilters={currentFilters}
                onFiltersChange={applyFiltersAndSyncUrl}
                onProductsChange={handleProductsChange}
              />
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-[3/4]" />
                ))}
              </div>
            ) : displayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedProducts.map((p) => (
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl">
                <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900">No products found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  There are no products currently available under this brand. Check back soon or browse other brands.
                </p>
                <button
                  onClick={() => setSelectedBrand('all')}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition"
                >
                  View All Brands
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
