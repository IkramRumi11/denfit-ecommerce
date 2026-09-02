import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { productId } from '../utils/productHelpers';
import { productsAPI } from '../api';
import { SlidersHorizontal, X } from 'lucide-react';

type AnyProduct = Record<string, any>;

type GenderKey = 'all' | 'men' | 'women' | 'boys' | 'girls';
type SortKey = 'new' | 'lowest' | 'highest';
type DiscountFilterKey = 'all' | '50' | '40' | '30' | '20';

export default function Sale(): JSX.Element {
  const [selectedGender, setSelectedGender] = useState<GenderKey>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDiscountTier, setSelectedDiscountTier] = useState<DiscountFilterKey>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('new');
  const [showFilters, setShowFilters] = useState(false);

  const [allProducts, setAllProducts] = useState<AnyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res: any = await productsAPI.getAll({ limit: 500 });
        const items = (res && (res.products || res.data?.products)) || [];
        const normalized = items.map((p: AnyProduct) => ({
          ...(p || {}),
          id: p?.id || p?._id || p?.slug || '',
        }));

        if (mounted) {
          setAllProducts(normalized);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load products for sale page', err);
        if (mounted) {
          setAllProducts([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Compute discount percentage helper
  const getProductDiscountPercent = (prod: AnyProduct): number => {
    const price = Number(prod.price ?? 0);
    const origPrice = Number(prod.originalPrice ?? prod.compareAtPrice ?? prod.original_price ?? 0);
    if (origPrice > 0 && origPrice > price) {
      return Math.round(((origPrice - price) / origPrice) * 100);
    }
    const explicitPct = Number(prod.discountPercentage ?? prod.discount ?? prod.discountPercent ?? 0);
    return Number.isFinite(explicitPct) && explicitPct > 0 ? Math.round(explicitPct) : 0;
  };

  // Synchronize sale products: Any product with a reduced price or on-sale status
  const saleProducts = useMemo(() => {
    return allProducts.filter((prod: AnyProduct) => {
      const price = Number(prod.price ?? 0);
      const origPrice = Number(prod.originalPrice ?? prod.compareAtPrice ?? prod.original_price ?? 0);
      const hasReducedPrice = origPrice > 0 && origPrice > price;
      const discountPct = getProductDiscountPercent(prod);

      const hasSaleTag = Array.isArray(prod.tags) && prod.tags.some((t: string) => /sale|clearance|discount|offer/i.test(String(t)));
      const hasDiscountTag = Array.isArray(prod.discountTags) && prod.discountTags.some((t: string) => /sale|clearance|discount|offer/i.test(String(t)));

      return (
        hasReducedPrice ||
        discountPct > 0 ||
        prod.onSale === true ||
        prod.isOnSale === true ||
        String(prod.gender || '').toLowerCase() === 'sale' ||
        String(prod.category || '').toLowerCase() === 'sale' ||
        String(prod.subcategory || '').toLowerCase() === 'sale' ||
        hasSaleTag ||
        hasDiscountTag
      );
    });
  }, [allProducts]);

  const priceBounds = useMemo(() => {
    let min = Infinity;
    let max = 0;

    for (const p of saleProducts) {
      const price = Number((p as AnyProduct).price ?? 0);
      if (price < min) min = price;
      if (price > max) max = price;
    }

    if (!isFinite(min)) min = 0;
    return { min, max };
  }, [saleProducts]);

  const [priceMin, setPriceMin] = useState<number>(priceBounds.min);
  const [priceMax, setPriceMax] = useState<number>(priceBounds.max);

  const [tempPriceMin, setTempPriceMin] = useState<number>(priceBounds.min);
  const [tempPriceMax, setTempPriceMax] = useState<number>(priceBounds.max);

  useEffect(() => {
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
    setTempPriceMin(priceBounds.min);
    setTempPriceMax(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const genderCategories = {
    men: {
      name: "Men's Sale",
      categories: [
        { name: 'View All', slug: 'all' },
        { name: 'Jackets', slug: 'jackets' },
        { name: 'Coats', slug: 'coats' },
        { name: 'Sweaters', slug: 'sweaters' },
        { name: 'Hoodies', slug: 'hoodies' },
        { name: 'Sweatshirts', slug: 'sweatshirts' },
        { name: 'T-Shirts', slug: 't-shirts' },
        { name: 'Shirts', slug: 'shirts' },
        { name: 'Polo', slug: 'polo' },
        { name: 'Trousers', slug: 'trousers' },
        { name: 'Shorts', slug: 'shorts' },
        { name: 'Pants', slug: 'pants' },
        { name: 'Jeans', slug: 'jeans' },
        { name: 'Activewear', slug: 'activewear' },
        { name: 'Accessories', slug: 'accessories' },
      ],
    },
    women: {
      name: "Women's Sale",
      categories: [
        { name: 'View All', slug: 'all' },
        { name: 'Jackets', slug: 'jackets' },
        { name: 'Coats', slug: 'coats' },
        { name: 'Sweaters', slug: 'sweaters' },
        { name: 'Hoodies', slug: 'hoodies' },
        { name: 'Sweatshirts', slug: 'sweatshirts' },
        { name: 'T-Shirts', slug: 't-shirts' },
        { name: 'Shirts', slug: 'shirts' },
        { name: 'Tops', slug: 'tops' },
        { name: 'Trousers', slug: 'trousers' },
        { name: 'Jumpsuits', slug: 'jumpsuits' },
        { name: 'Co-ords Sets', slug: 'co-ords' },
        { name: 'Jeans', slug: 'jeans' },
        { name: 'Activewear', slug: 'activewear' },
        { name: 'Accessories', slug: 'accessories' },
      ],
    },
    boys: {
      name: "Boys' Sale",
      categories: [
        { name: 'View All', slug: 'all' },
        { name: 'Jackets', slug: 'jackets' },
        { name: 'Sweaters', slug: 'sweaters' },
        { name: 'Hoodies', slug: 'hoodies' },
        { name: 'Sweatshirts', slug: 'sweatshirts' },
        { name: 'Trousers', slug: 'trousers' },
        { name: 'Pants', slug: 'pants' },
        { name: 'Jeans', slug: 'jeans' },
        { name: 'Shorts', slug: 'shorts' },
        { name: 'Shirts', slug: 'shirts' },
        { name: 'T-Shirts', slug: 't-shirts' },
        { name: 'Polos', slug: 'polos' },
        { name: 'Accessories', slug: 'accessories' },
      ],
    },
    girls: {
      name: "Girls' Sale",
      categories: [
        { name: 'View All', slug: 'all' },
        { name: 'Jackets', slug: 'jackets' },
        { name: 'Sweaters', slug: 'sweaters' },
        { name: 'Hoodies', slug: 'hoodies' },
        { name: 'Sweatshirts', slug: 'sweatshirts' },
        { name: 'Coats', slug: 'coats' },
        { name: 'Tops', slug: 'tops' },
        { name: 'T-Shirts', slug: 't-shirts' },
        { name: 'Jumpsuits', slug: 'jumpsuits' },
        { name: 'Co-ord Sets', slug: 'co-ords' },
        { name: 'Bottoms', slug: 'bottoms' },
        { name: 'Accessories', slug: 'accessories' },
      ],
    },
  };

  const filteredProducts = saleProducts.filter((p: AnyProduct) => {
    if (selectedGender !== 'all') {
      const productGender = String(p.gender || '').toLowerCase();
      const productAgeGroup = String(p.ageGroup || '').toLowerCase();

      let genderMatches = false;
      if (selectedGender === 'men') {
        genderMatches = productGender === 'men' || productGender === 'unisex' || productGender === 'accessories' || !p.gender;
      } else if (selectedGender === 'women') {
        genderMatches = productGender === 'women' || productGender === 'unisex' || productGender === 'accessories' || !p.gender;
      } else if (selectedGender === 'boys') {
        genderMatches = productGender === 'boys' || productGender === 'kids' || productAgeGroup === 'kids' || productGender === 'unisex';
      } else if (selectedGender === 'girls') {
        genderMatches = productGender === 'girls' || productGender === 'kids' || productAgeGroup === 'kids' || productGender === 'unisex';
      }

      if (!genderMatches) return false;

      if (selectedCategory !== 'all') {
        const catTarget = selectedCategory.toLowerCase().trim();
        const singular = catTarget.endsWith('s') && catTarget.length > 2 ? catTarget.slice(0, -1) : catTarget;
        const candidates = [
          p.category,
          p.categorySlug,
          p.subcategory,
          p.subCategory,
          p.type,
          p.name,
          ...(Array.isArray(p.tags) ? p.tags : [])
        ].map(x => String(x || '').toLowerCase());

        const matchesCat = candidates.some(c => c.includes(catTarget) || c.includes(singular));
        if (!matchesCat) return false;
      }
    }

    // Discount tier filter
    if (selectedDiscountTier !== 'all') {
      const minDiscount = Number(selectedDiscountTier);
      const currentDiscount = getProductDiscountPercent(p);
      if (currentDiscount < minDiscount) return false;
    }

    const price = Number(p.price ?? 0);
    if (price < priceMin || price > priceMax) return false;

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a: AnyProduct, b: AnyProduct) => {
    if (sortBy === 'lowest') return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === 'highest') return Number(b.price || 0) - Number(a.price || 0);
    return 0;
  });

  const handleGenderChange = (gender: GenderKey) => {
    setSelectedGender(gender);
    setSelectedCategory('all');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    setSelectedCategory('all');
  }, [selectedGender]);

  const handleClearAll = () => {
    setSelectedGender('all');
    setSelectedCategory('all');
    setSelectedDiscountTier('all');
    setSortBy('new');
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
    setTempPriceMin(priceBounds.min);
    setTempPriceMax(priceBounds.max);
    setIsMobileSidebarOpen(false);
    setShowFilters(false);
  };

  const openMobileFilters = () => {
    setTempPriceMin(priceMin);
    setTempPriceMax(priceMax);
    setShowFilters(true);
  };

  const applyMobileFilters = () => {
    const min = Math.max(priceBounds.min, Math.min(tempPriceMin, tempPriceMax));
    const max = Math.min(priceBounds.max, Math.max(tempPriceMin, tempPriceMax));
    setPriceMin(min);
    setPriceMax(max);
    setShowFilters(false);
    setIsMobileSidebarOpen(false);
  };

  const resetMobileFilters = () => {
    setTempPriceMin(priceBounds.min);
    setTempPriceMax(priceBounds.max);
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
  };

  return (
    <div className="w-full">
      <section className="relative w-full h-[250px] md:h-[350px] mb-6 md:mb-8">
        <img
          src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1800&auto=format&fit=crop"
          alt="Sale"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/70 to-black/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-light text-white mb-3 tracking-[0.2em] uppercase">
              SALE
            </h1>
            <p className="text-xl md:text-2xl text-white font-semibold">
              FLAT 50% OFF
            </p>
          </div>
        </div>
      </section>

      <div className="bg-gray-100 border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => handleGenderChange('all')}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${selectedGender === 'all'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
                }`}
              type="button"
            >
              ALL SALE ITEMS
            </button>
            {Object.entries(genderCategories).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleGenderChange(key as GenderKey)}
                className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${selectedGender === key
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                  }`}
                type="button"
              >
                {value.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:hidden flex gap-2">
            <button
              onClick={() => {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
                setShowFilters(false);
              }}
              className="flex-1 bg-black text-white px-4 py-3 font-semibold uppercase text-sm tracking-wider"
              type="button"
            >
              Categories
            </button>
            <button
              onClick={() => {
                if (!showFilters) openMobileFilters();
                else setShowFilters(false);
              }}
              className="flex-1 bg-gray-800 text-white px-4 py-3 font-semibold uppercase text-sm tracking-wider"
              type="button"
            >
              Filters
            </button>
          </div>

          <aside className={`lg:w-64 flex-shrink-0 ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-gray-200 p-6 mb-4 rounded-sm shadow-sm">
              <h2 className="text-lg font-semibold mb-4 uppercase tracking-wider text-gray-800">Categories</h2>

              {selectedGender !== 'all' ? (
                <div className="space-y-1">
                  {genderCategories[selectedGender as Exclude<GenderKey, 'all'>].categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => handleCategoryChange(cat.slug)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors rounded ${selectedCategory === cat.slug
                          ? 'bg-black text-white font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      type="button"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Select a gender tab above to filter by category
                </p>
              )}
            </div>

            <div className={`bg-white border border-gray-200 p-6 rounded-sm shadow-sm ${showFilters || !isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold uppercase tracking-wider text-gray-800">Filters</h2>
                <button onClick={handleClearAll} className="text-sm text-gray-600 hover:text-black underline" type="button">
                  Clear All
                </button>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="w-full border border-gray-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-black"
                >
                  <option value="new">NEW</option>
                  <option value="lowest">LOWEST PRICE</option>
                  <option value="highest">HIGHEST PRICE</option>
                </select>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Price</h3>

                <div className="hidden md:block">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value || priceBounds.min);
                        setPriceMin(Math.min(Math.max(priceBounds.min, val), priceMax));
                      }}
                      className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                    />
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value || priceBounds.max);
                        setPriceMax(Math.max(Math.min(priceBounds.max, val), priceMin));
                      }}
                      className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPriceMin(Math.min(val, priceMax));
                      }}
                      className="w-full accent-black"
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPriceMax(Math.max(val, priceMin));
                      }}
                      className="w-full accent-black"
                    />
                    <div className="text-sm text-gray-600">Rs. {priceMin} - Rs. {priceMax}</div>
                  </div>
                </div>

                <div className="md:hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={tempPriceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value || priceBounds.min);
                        setTempPriceMin(Math.min(Math.max(priceBounds.min, val), tempPriceMax));
                      }}
                      className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                    />
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={tempPriceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value || priceBounds.max);
                        setTempPriceMax(Math.max(Math.min(priceBounds.max, val), tempPriceMin));
                      }}
                      className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                    />
                  </div>

                  <div className="space-y-2 mb-4">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={tempPriceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTempPriceMin(Math.min(val, tempPriceMax));
                      }}
                      className="w-full accent-black"
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={tempPriceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTempPriceMax(Math.max(val, tempPriceMin));
                      }}
                      className="w-full accent-black"
                    />
                    <div className="text-sm text-gray-600">Rs. {tempPriceMin} - Rs. {tempPriceMax}</div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={applyMobileFilters}
                      className="flex-1 bg-black text-white px-4 py-3 font-semibold uppercase text-sm tracking-wider rounded"
                      type="button"
                    >
                      Apply
                    </button>
                    <button
                      onClick={resetMobileFilters}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 font-semibold uppercase text-sm tracking-wider rounded"
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <button
                      key={size}
                      className="px-3 py-1 border border-gray-200 text-sm hover:border-black hover:bg-black hover:text-white transition-colors"
                      type="button"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Discount</h3>
                <div className="space-y-2">
                  {[
                    { label: 'All Discounted Items', value: 'all' },
                    { label: '50% & Above', value: '50' },
                    { label: '40% & Above', value: '40' },
                    { label: '30% & Above', value: '30' },
                    { label: '20% & Above', value: '20' },
                  ].map((tier) => (
                    <label key={tier.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="discountTier"
                        value={tier.value}
                        checked={selectedDiscountTier === tier.value}
                        onChange={() => setSelectedDiscountTier(tier.value as DiscountFilterKey)}
                        className="mr-2 accent-black"
                      />
                      <span className={`text-sm ${selectedDiscountTier === tier.value ? 'font-medium text-black' : 'text-gray-600'}`}>
                        {tier.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-0">
                <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Color</h3>
                <div className="space-y-2">
                  {['Black', 'White', 'Beige', 'Grey', 'Blue', 'Brown'].map((color) => (
                    <label key={color} className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedGender === 'all'
                    ? 'All Sale Items'
                    : genderCategories[selectedGender as Exclude<GenderKey, 'all'>].name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              <div className="hidden md:block">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="border border-gray-300 px-4 py-2 rounded text-sm focus:outline-none focus:border-black"
                >
                  <option value="new">Sort: NEW</option>
                  <option value="lowest">Sort: LOWEST PRICE</option>
                  <option value="highest">Sort: HIGHEST PRICE</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <p className="mt-4 text-sm text-gray-500">Loading sale items...</p>
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {sortedProducts.map((product: AnyProduct) => (
                  <ProductCard key={productId(product)} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No items found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or browse all sale items</p>
                <button
                  onClick={handleClearAll}
                  className="inline-block bg-black text-white px-8 py-3 font-semibold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
                  type="button"
                >
                  View All Sale Items
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

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
                <h2 className="text-lg font-medium">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-2" type="button">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Sort By</h3>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="w-full border border-gray-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-black"
                    >
                      <option value="new">NEW</option>
                      <option value="lowest">LOWEST PRICE</option>
                      <option value="highest">HIGHEST PRICE</option>
                    </select>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Price</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="number"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={tempPriceMin}
                        onChange={(e) => {
                          const val = Number(e.target.value || priceBounds.min);
                          setTempPriceMin(Math.min(Math.max(priceBounds.min, val), tempPriceMax));
                        }}
                        className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                      />
                      <input
                        type="number"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={tempPriceMax}
                        onChange={(e) => {
                          const val = Number(e.target.value || priceBounds.max);
                          setTempPriceMax(Math.max(Math.min(priceBounds.max, val), tempPriceMin));
                        }}
                        className="w-1/2 border border-gray-200 px-3 py-2 rounded text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={tempPriceMin}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTempPriceMin(Math.min(val, tempPriceMax));
                        }}
                        className="w-full accent-black"
                      />
                      <input
                        type="range"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={tempPriceMax}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTempPriceMax(Math.max(val, tempPriceMin));
                        }}
                        className="w-full accent-black"
                      />
                      <div className="text-sm text-gray-600">Rs. {tempPriceMin} - Rs. {tempPriceMax}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Discount</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'All Discounted Items', value: 'all' },
                        { label: '50% & Above', value: '50' },
                        { label: '40% & Above', value: '40' },
                        { label: '30% & Above', value: '30' },
                        { label: '20% & Above', value: '20' },
                      ].map((tier) => (
                        <label key={tier.value} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="mobileDiscountTier"
                            value={tier.value}
                            checked={selectedDiscountTier === tier.value}
                            onChange={() => setSelectedDiscountTier(tier.value as DiscountFilterKey)}
                            className="mr-2 accent-black"
                          />
                          <span className={`text-sm ${selectedDiscountTier === tier.value ? 'font-medium text-black' : 'text-gray-600'}`}>
                            {tier.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 text-sm uppercase text-gray-700">Size</h3>
                    <div className="flex flex-wrap gap-2">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                        <button
                          key={size}
                          className="px-3 py-1 border border-gray-200 text-sm hover:border-black hover:bg-black hover:text-white transition-colors"
                          type="button"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={applyMobileFilters}
                  className="flex-1 py-3 bg-black text-white font-bold rounded-xl"
                  type="button"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    resetMobileFilters();
                    setSortBy('new');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl"
                  type="button"
                >
                  Reset
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}