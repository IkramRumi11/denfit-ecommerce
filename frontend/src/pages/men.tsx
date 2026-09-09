import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X, Check } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import {
  productId,
  productUrl,
  extractAvailableColors,
  productMatchesColor,
  isLightColorHex,
  AvailableColorItem,
} from '../utils/productHelpers';
import { FilterEngine } from '../components/FilterEngine';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { productsAPI } from '../api';
import { usePageBanner } from '../hooks/usePageBanner';

type AnyProduct = Record<string, any>;
type AnyFilters = Record<string, any>;

type CategoryTile = {
  title: string;
  slug: string;
  image: string;
};

export default function Men(): JSX.Element {
  const [baseProducts, setBaseProducts] = useState<AnyProduct[]>([]);
  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<AnyFilters>({});
  const location = useLocation();
  const navigate = useNavigate();

  // Colors available across men products
  const availableColors = useMemo(
    () => extractAvailableColors(baseProducts),
    [baseProducts]
  );

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

        if (mounted && Array.isArray(facets.sizes)) {
          setAvailableSizes(facets.sizes.map((s: any) => String(s)).filter(Boolean));
        }

        const res: any = await productsAPI.getAll({ gender: 'men', limit: 48 });
        const items = (res && (res.data?.products || res.products)) || [];
        const normalized = items.map((p: AnyProduct) => ({
          ...(p || {}),
          id: p?.id || p?._id || p?.slug || '',
        }));

        if (mounted) {
          setBaseProducts(normalized);
          setProducts(normalized);
          setTotal(normalized.length);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load men products', err);
        if (mounted) {
          setBaseProducts([]);
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
      let normalized = items.map((p: AnyProduct) => ({
        ...(p || {}),
        id: p?.id || p?._id || p?.slug || '',
      }));

      // Extra client-side match to ensure multi-color products are matched consistently
      if (filters?.color) {
        normalized = normalized.filter((p: AnyProduct) =>
          productMatchesColor(p, filters.color)
        );
      }

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

  const handleColorClick = (colorItem: AvailableColorItem) => {
    const activeColor = String(currentFilters?.color || '').trim().toLowerCase();
    const isSelected = activeColor === colorItem.name.toLowerCase() || activeColor === colorItem.slug;
    const nextColor = isSelected ? '' : colorItem.name;

    const nextFilters = { ...currentFilters };
    if (nextColor) {
      nextFilters.color = nextColor;
    } else {
      delete nextFilters.color;
    }

    void applyFiltersAndSyncUrl(nextFilters);
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
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs uppercase tracking-[0.20em] font-medium transition-all ${
                showFilters
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'border-gray-200 hover:border-black text-gray-900 bg-white'
              }`}
              type="button"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{showFilters ? 'Hide Filters' : 'Refine'}</span>
              {Object.keys(currentFilters || {}).length > 0 && (
                <span className={`w-2 h-2 rounded-full ${showFilters ? 'bg-white' : 'bg-black'}`} />
              )}
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

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-2">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Men' }]} />
      </div>

      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Featured Items
        </h2>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Collapsible Desktop Filter Sidebar */}
          {showFilters && (
            <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 animate-fadeIn">
              <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm max-h-[calc(100vh-7rem)] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-900">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                    title="Close filters"
                    aria-label="Close filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <FilterEngine
                  gender="men"
                  onProductsChange={handleProductsChange}
                  onLoadingChange={setLoading}
                  onTotalChange={setTotal}
                  pageSize={24}
                  inline={true}
                  showHeader={false}
                />
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <p className="mt-4 text-sm text-gray-500">Loading products...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product: AnyProduct) => (
                  <ProductCard key={productId(product)} product={product as any} />
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
            availableColors.map((colorItem) => {
              const activeColor = String(currentFilters?.color || '').trim().toLowerCase();
              const isActive = activeColor === colorItem.name.toLowerCase() || activeColor === colorItem.slug;
              return (
                <button
                  key={colorItem.slug}
                  type="button"
                  onClick={() => handleColorClick(colorItem)}
                  className={`flex flex-col items-center group transition-transform ${isActive ? 'scale-105' : ''}`}
                  title={`Filter by ${colorItem.name}`}
                  aria-label={`Filter by ${colorItem.name}${isActive ? ' (active, click to clear)' : ''}`}
                >
                  <div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 transition-all duration-300 group-hover:scale-110 relative ${
                      isActive
                        ? 'border-black ring-4 ring-black/20 shadow-md'
                        : 'border-gray-200 group-hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: colorItem.hex }}
                  >
                    {isActive && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className={`w-6 h-6 ${isLightColorHex(colorItem.hex) ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className={`mt-2 text-xs md:text-sm font-medium uppercase tracking-wide ${isActive ? 'text-black font-bold underline' : 'text-gray-700'}`}>
                    {colorItem.name}
                  </span>
                </button>
              );
            })
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
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl border-l border-gray-200 flex flex-col lg:hidden"
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
                  inline={true}
                  showHeader={false}
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
  const { banner } = usePageBanner('men_hero');

  const imageUrl = banner?.imageUrl || 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=1800&auto=format&fit=crop';
  const title = banner?.title || "MEN'S COLLECTION";
  const subtitle = banner?.subtitle || "Discover premium style and comfort";
  const buttonLink = banner?.link || "/shop?gender=men";
  const buttonText = banner?.buttonText || "Shop Now";

  return (
    <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-8 md:mb-12">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase">
              {title}
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={buttonLink}
                className="inline-block bg-white text-black px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors"
              >
                {buttonText}
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
              to={img.product ? productUrl(img.product) : '#'}
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