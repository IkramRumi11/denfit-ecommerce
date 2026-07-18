import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { productId } from '../utils/productHelpers';
import { FilterEngine } from '../components/FilterEngine';
import { productsAPI } from '../api';

type AnyProduct = Record<string, any>;
type AnyFilters = Record<string, any>;

type CategoryTile = {
  title: string;
  slug: string;
  image: string;
};

type ColorFacet = string;

export default function Men(): JSX.Element {
  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [availableColors, setAvailableColors] = useState<ColorFacet[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<AnyFilters>({});
  const location = useLocation();
  const navigate = useNavigate();

  const categoryTiles: CategoryTile[] = useMemo(
    () => [
      { title: 'T-SHIRTS', slug: 't-shirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop' },
      { title: 'HOODIES', slug: 'hoodies-sweatshirts', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop' },
      { title: 'SHIRTS', slug: 'shirts', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop' },
      { title: 'JEANS', slug: 'jeans', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop' },
      { title: 'JACKETS', slug: 'jackets-coats', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop' },
      { title: 'PANTS', slug: 'pants-trousers', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop' },
      { title: 'POLO', slug: 'polo', image: 'https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800&auto=format&fit=crop' },
      { title: 'SNEAKERS', slug: 'sneakers', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop' },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const facetsRes: any = await productsAPI.getFilters();
        const facets = (facetsRes && (facetsRes.data || facetsRes)) || {};

        if (mounted) {
          if (Array.isArray(facets.colors)) {
            setAvailableColors(facets.colors.map((c: any) => String(c)).filter(Boolean));
          }
          if (Array.isArray(facets.sizes)) {
            setAvailableSizes(facets.sizes.map((s: any) => String(s)).filter(Boolean));
          }
        }

        const res: any = await productsAPI.getAll({ gender: 'men', limit: 48 });
        const items = (res && (res.data?.products || res.products)) || [];
        const normalized = items.map((p: AnyProduct) => ({
          ...(p || {}),
          id: p?.id || p?._id || p?.slug || '',
        }));

        if (mounted) {
          setProducts(normalized);
          setTotal(normalized.length);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load men products', err);
        if (mounted) {
          setProducts([]);
          setTotal(0);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleProductsChange = (nextProducts: AnyProduct[]) => {
    setProducts(nextProducts || []);
    setTotal((nextProducts || []).length);
  };

  const applyFiltersAndSyncUrl = async (filters: AnyFilters) => {
    setCurrentFilters(filters);

    try {
      const params: any = { gender: 'men', limit: 48 };

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
      const normalized = items.map((p: AnyProduct) => ({
        ...(p || {}),
        id: p?.id || p?._id || p?.slug || '',
      }));

      setProducts(normalized);
      setTotal(normalized.length);

      const qs = new URLSearchParams();
      if (filters?.color) qs.set('color', String(filters.color));
      if (filters?.sizes && Array.isArray(filters.sizes) && filters.sizes.length) qs.set('sizes', filters.sizes.join(','));
      if (filters?.priceRange) qs.set('price', String(filters.priceRange));
      if (filters?.rating) qs.set('rating', String(filters.rating));
      if (filters?.search) qs.set('search', String(filters.search));

      navigate(
        { pathname: '/men', search: qs.toString() ? `?${qs.toString()}` : '' },
        { replace: true }
      );
    } catch (err) {
      console.error('Filter request failed', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const colorParam = params.get('color');
    const sizesParam = params.get('sizes');
    const priceParam = params.get('price');
    const ratingParam = params.get('rating');
    const searchParam = params.get('search');

    if (!colorParam && !sizesParam && !priceParam && !ratingParam && !searchParam) return;

    const parsedFilters: AnyFilters = {};
    if (colorParam) parsedFilters.color = colorParam;
    if (sizesParam) parsedFilters.sizes = String(sizesParam).split(',').map((s) => s.trim()).filter(Boolean);
    if (priceParam && !Number.isNaN(Number(priceParam))) parsedFilters.priceRange = Number(priceParam);
    if (ratingParam && !Number.isNaN(Number(ratingParam))) parsedFilters.rating = Number(ratingParam);
    if (searchParam) parsedFilters.search = searchParam;

    setCurrentFilters(parsedFilters);
    void applyFiltersAndSyncUrl(parsedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return (
    <div className="w-full">
      <HeroSection />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=1200&auto=format&fit=crop"
              alt="Featured Collection"
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1483118714900-540cf339fd46?q=80&w=1200&auto=format&fit=crop"
              alt="Winter Collection"
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {categoryTiles.map((category) => (
            <Link
              key={category.slug}
              to={`/men/${category.slug}`}
              className="relative overflow-hidden group aspect-square rounded-xl"
            >
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <h3 className="text-white font-bold text-sm md:text-base uppercase tracking-wider">
                  {category.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-3 hover:text-emerald-400 transition-colors"
              type="button"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.26em] font-normal">Refine</span>
            </button>

            <div className="hidden md:block h-4 w-px bg-gray-200" />

            <span className="hidden md:block text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              {total || products.length} Items Found
            </span>

            {Object.keys(currentFilters || {}).length > 0 && (
              <span className="hidden lg:inline-block text-[10px] uppercase tracking-[0.32em] text-zinc-400">
                Filters Applied
              </span>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Featured Items
        </h2>

        <div className="flex gap-8">
          <FilterEngine
            gender="men"
            onProductsChange={(next: AnyProduct[]) => {
              handleProductsChange(next);
            }}
            onLoadingChange={setLoading}
            onTotalChange={setTotal}
            pageSize={24}
          />

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <p className="mt-4 text-sm text-gray-500">Loading products...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product: AnyProduct) => (
                  <ProductCard key={productId(product)} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-500">
                No products found. Try adjusting your filters.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Shop by Color
        </h2>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {availableColors.length === 0 ? (
            <div className="text-sm text-gray-500">No colors available</div>
          ) : (
            availableColors.map((c) => (
              <Link
                key={String(c)}
                to={`/men?color=${encodeURIComponent(String(c))}`}
                className="flex flex-col items-center group"
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-200 group-hover:border-gray-400 transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: String(c) }}
                />
                <span className="mt-2 text-xs md:text-sm font-medium text-gray-700 uppercase tracking-wide">
                  {String(c)}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <StyledByYouSection />

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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl border-l border-gray-200 flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <FilterEngine
                  gender="men"
                  onProductsChange={(next: AnyProduct[]) => {
                    handleProductsChange(next);
                  }}
                  onLoadingChange={setLoading}
                  onTotalChange={setTotal}
                  pageSize={48}
                  headless={false}
                />

                {availableSizes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-3">
                      Available Sizes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => (
                        <span
                          key={size}
                          className="px-3 py-1 rounded-full border border-gray-200 text-xs text-gray-700 uppercase"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl"
                  type="button"
                >
                  View {products.length} Items
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-8 md:mb-12">
      <img
        src="https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=1800&auto=format&fit=crop"
        alt="Men's Collection"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase">
              MEN&apos;S COLLECTION
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8">
              Discover premium style and comfort
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/shop?gender=men"
                className="inline-block bg-white text-black px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                to="/shop?gender=men&sort=newest"
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

function StyledByYouSection() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res: any = await (await import('../api')).styleByYouAPI.getAll();
        const list = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
        if (mounted) setItems(list);
      } catch (err) {
        console.error('Failed to load Styled by You', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!items.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 uppercase tracking-wider text-center">
          Styled by You
        </h2>
        <p className="text-center text-gray-600">No looks available yet.</p>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 uppercase tracking-wider text-center">
        Styled by You
      </h2>
      <p className="text-center text-gray-600 mb-6 md:mb-8">Click to shop the looks you love</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {items.map((entry: any) =>
          (entry.images || []).map((img: any, i: number) => (
            <Link
              key={`${entry._id || entry.id || 'styled'}-${i}`}
              to={img.product ? `/product/${img.product}` : '#'}
              className="relative aspect-square overflow-hidden group"
            >
              <img
                src={img.url}
                alt={img.caption || 'Styled Look'}
                className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              <div className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-xl font-bold">+</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}