import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { productId } from '../utils/productHelpers';
import { productsAPI } from '../api';
import { ProductFilters } from '../components/ProductFilters';
import { SlidersHorizontal, X } from 'lucide-react';

type AnyProduct = Record<string, any>;
type AnyFilters = Record<string, any>;

export default function Women(): JSX.Element {
  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AnyProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [currentFilters, setCurrentFilters] = useState<AnyFilters>({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await productsAPI.getAll({ category: 'women', limit: 48 });
        const items = (res && (res.products || res.data?.products)) || [];
        const normalized = items.map((p: AnyProduct) => ({ ...(p || {}), id: p?.id || p?._id || p?.slug || '' }));
        if (mounted) {
          setProducts(normalized);
          setFilteredProducts(normalized);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load women products', err);
        if (mounted) {
          setProducts([]);
          setFilteredProducts([]);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const availableColors = useMemo(() => {
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
      if (product.color) set.add(String(product.color));
    });
    return Array.from(set);
  }, [products]);

  const availableSizes = useMemo(() => {
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

  const handleFilterChange = (filters: AnyFilters) => {
    setCurrentFilters(filters);

    let filtered = [...products];

    if (filters.priceRange) {
      filtered = filtered.filter((product: AnyProduct) => Number(product.price || 0) <= Number(filters.priceRange));
    }

    if (filters.sizes && Array.isArray(filters.sizes) && filters.sizes.length) {
      filtered = filtered.filter((product: AnyProduct) => {
        const prodSizes = Array.isArray(product.sizes)
          ? product.sizes
          : (Array.isArray(product.sizesObjects) ? product.sizesObjects.map((x: any) => x.value || x) : []);
        return prodSizes.some((size: any) => filters.sizes.includes(String(size)));
      });
    }

    if (filters.color && String(filters.color).trim() !== '') {
      const needle = String(filters.color).toLowerCase();
      const matchesColor = (product: AnyProduct) => {
        if (Array.isArray(product.variants)) {
          for (const v of product.variants) {
            const name = String(v && (v.name || v.displayName || v.value || '')).toLowerCase();
            const hex = String(v && (v.hex || v.normalizedHex || v.value || '')).toLowerCase();
            if (name === needle || hex === needle) return true;
          }
        }
        if (Array.isArray(product.colors)) {
          for (const c of product.colors) {
            const name = String(c && (c.name || c.displayName || c.value || '')).toLowerCase();
            const hex = String(c && (c.hex || c.normalizedHex || c.value || '')).toLowerCase();
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

    if (filters.rating) {
      filtered = filtered.filter((product: AnyProduct) => (product.rating || 0) >= filters.rating);
    }

    if (filters.search && String(filters.search).trim() !== '') {
      const q = String(filters.search).toLowerCase();
      filtered = filtered.filter((p: AnyProduct) => {
        try {
          if (p.name && String(p.name).toLowerCase().includes(q)) return true;
          if (p.description && String(p.description).toLowerCase().includes(q)) return true;
          if (Array.isArray(p.tags) && p.tags.map(String).some((t: any) => String(t).toLowerCase().includes(q))) return true;
          return false;
        } catch (e) {
          return false;
        }
      });
    }

    setFilteredProducts(filtered);

    try {
      const params = new URLSearchParams(location.search);
      if (filters.color) params.set('color', String(filters.color)); else params.delete('color');
      if (filters.sizes && Array.isArray(filters.sizes) && filters.sizes.length) params.set('sizes', filters.sizes.join(',')); else params.delete('sizes');
      if (filters.priceRange) params.set('price', String(filters.priceRange)); else params.delete('price');
      if (filters.rating) params.set('rating', String(filters.rating)); else params.delete('rating');
      if (filters.search) params.set('search', String(filters.search)); else params.delete('search');
      const qs = params.toString();
      navigate({ pathname: '/women', search: qs ? `?${qs}` : '' }, { replace: true });
    } catch (e) {
      // ignore URL sync errors
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
    if (sizesParam) parsedFilters.sizes = String(sizesParam).split(',').map(s => s.trim()).filter(Boolean);
    if (priceParam && !Number.isNaN(Number(priceParam))) parsedFilters.priceRange = Number(priceParam);
    if (ratingParam && !Number.isNaN(Number(ratingParam))) parsedFilters.rating = Number(ratingParam);
    if (searchParam) parsedFilters.search = searchParam;

    setCurrentFilters(parsedFilters);
    handleFilterChange(parsedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, products]);

  const categoryTiles = [
    { title: 'COAT', slug: 'coats', image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop' },
    { title: 'CO-ORD SET', slug: 'coord-sets', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?q=80&w=800&auto=format&fit=crop' },
    { title: 'HOODIES', slug: 'hoodies', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop' },
    { title: 'JACKETS', slug: 'jackets', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=800&auto=format&fit=crop' },
    { title: 'SWEATSHIRT', slug: 'sweatshirts', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop' },
    { title: 'TOPS', slug: 'tops', image: 'https://images.unsplash.com/photo-1564257631407-2dab8d655261?q=80&w=800&auto=format&fit=crop' },
    { title: 'JEANS', slug: 'jeans', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop' },
    { title: 'FOOTWEAR', slug: 'footwear', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop' },
    { title: 'SWEATER', slug: 'sweaters', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop' },
    { title: 'TROUSER', slug: 'trousers', image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800&auto=format&fit=crop' },
  ];

  const colorFilters = [
    { name: 'Brown', color: '#8B4513', slug: 'brown' },
    { name: 'Black', color: '#000000', slug: 'black' },
    { name: 'Beige', color: '#F5F5DC', slug: 'beige' },
    { name: 'Blue', color: '#0066CC', slug: 'blue' },
    { name: 'Grey', color: '#808080', slug: 'grey' },
    { name: 'Green', color: '#228B22', slug: 'green' },
    { name: 'Yellow', color: '#FFD700', slug: 'yellow' },
    { name: 'Pink', color: '#FF69B4', slug: 'pink' },
    { name: 'White', color: '#FFFFFF', slug: 'white' },
    { name: 'Burgundy', color: '#800020', slug: 'burgundy' },
    { name: 'Red', color: '#DC143C', slug: 'red' },
  ];

  return (
    <div className="w-full">
      <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-8 md:mb-12">
        <img
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1800&auto=format&fit=crop"
          alt="Women's Collection"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase">
                WOMEN'S COLLECTION
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8">
                Elevate your style with timeless elegance
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/shop?gender=women"
                  className="inline-block bg-white text-black px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors"
                >
                  Shop Now
                </Link>
                <Link
                  to="/shop?gender=women&type=new"
                  className="inline-block border-2 border-white text-white px-6 md:px-8 py-3 md:py-4 font-semibold uppercase text-sm tracking-wider hover:bg-white hover:text-black transition-colors"
                >
                  New Arrivals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1200&auto=format&fit=crop"
              alt="Featured Collection"
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?q=80&w=1200&auto=format&fit=crop"
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
              to={`/women/${category.slug}`}
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
              className="flex items-center gap-3 group hover:text-emerald-400 transition-colors"
              type="button"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.26em] font-normal">Refine</span>
            </button>
            <div className="hidden md:block h-4 w-px bg-white/10" />
            <span className="hidden md:block text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              {filteredProducts.length} Items Found
            </span>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Featured Items
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              <p className="mt-4 text-sm text-gray-500">Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.slice(0, 48).map((product: AnyProduct) => (
              <ProductCard key={productId(product)} product={product} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-gray-500">
              No products found. Try adjusting your filters.
            </div>
          )}
        </div>
      </section>

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
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-medium">Refine</h2>
                <button onClick={() => setShowFilters(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ProductFilters
                  onFilterChange={handleFilterChange}
                  colors={availableColors}
                  sizes={availableSizes}
                  initialFilters={currentFilters}
                />
              </div>
              <div className="p-6 border-t">
                <button onClick={() => setShowFilters(false)} className="w-full py-3 bg-emerald-500 text-black font-bold">
                  View {filteredProducts.length} Items
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
          Shop by Color
        </h2>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {colorFilters.map((colorItem) => (
            <Link
              key={colorItem.slug}
              to={`/shop?gender=women&color=${encodeURIComponent(colorItem.slug)}`}
              className="flex flex-col items-center group"
            >
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-200 group-hover:border-gray-400 transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: colorItem.color }}
              />
              <span className="mt-2 text-xs md:text-sm font-medium text-gray-700 uppercase tracking-wide">
                {colorItem.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <StyledByYouSection />
    </div>
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
    return () => { mounted = false; };
  }, []);

  if (!items.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 uppercase tracking-wider text-center">Styled by You</h2>
        <p className="text-center text-gray-600">No looks available yet.</p>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 uppercase tracking-wider text-center">Styled by You</h2>
      <p className="text-center text-gray-600 mb-6 md:mb-8">Click to shop the looks you love</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {items.map((entry: any) =>
          (entry.images || []).map((img: any, i: number) => (
            <Link key={`${entry._id || entry.id || 'styled'}-${i}`} to={img.product ? `/product/${img.product}` : '#'} className="relative aspect-square overflow-hidden group">
              <img src={img.url} alt={img.caption || 'Styled Look'} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105" />
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