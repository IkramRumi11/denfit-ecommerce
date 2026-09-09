import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import {
  productId,
  slugify,
  extractAvailableColors,
  productMatchesColor,
  isLightColorHex,
  AvailableColorItem,
} from '../utils/productHelpers';
import { productsAPI } from '../api';
import megaMenuData from '../data/megaMenuData';
import { usePageBanner } from '../hooks/usePageBanner';

export default function Accessories(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load products and derive accessories set client-side
  const [accessoriesProducts, setAccessoriesProducts] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    productsAPI.getAll({ limit: 1000 })
      .then((res: any) => {
        const items = (res && (res.products || res.data?.products)) || [];
        const normalized = items.map((p: any) => ({ ...(p || {}), id: p.id || p._id || p.slug || '' }));

        // Build expanded accessory targets from megaMenuData
        const accMenu = (megaMenuData as any)['accessories'];
        let expanded: string[] = [];
        if (accMenu && accMenu.categories) {
          Object.values(accMenu.categories).forEach((arr: any) => {
            if (Array.isArray(arr)) arr.forEach((x: any) => expanded.push(String(slugify(x || ''))));
          });
        }
        expanded = Array.from(new Set(expanded.map((s) => String(s).toLowerCase())));

        const matchesAccessory = (p: any) => {
          const candidates = [p.category, p.subcategory, p.subCategory, p.type, p.section];
          if (Array.isArray(p.tags)) candidates.push(...p.tags);
          if (Array.isArray(p.colors)) candidates.push(...p.colors);
          for (const c of candidates.filter(Boolean)) {
            if (Array.isArray(c)) {
              if (c.map(String).some((x: any) => expanded.includes(String(slugify(x)).toLowerCase()))) return true;
            }
            try {
              if (expanded.includes(String(slugify(c)).toLowerCase())) return true;
            } catch (e) {}
            if (typeof c === 'string') {
              try {
                const parsed = JSON.parse(c as string);
                if (Array.isArray(parsed) && parsed.map(String).some((x: any) => expanded.includes(String(slugify(x)).toLowerCase()))) return true;
              } catch (e) {}
            }
          }
          // fallback: product name
          if (expanded.includes(String(slugify(p.name || '')).toLowerCase())) return true;
          return false;
        };

        if (mounted) setAccessoriesProducts(normalized.filter(matchesAccessory));
      })
      .catch((err: any) => console.error('Failed to load products for accessories', err));
    return () => { mounted = false; };
  }, []);

  // Sync color filter from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const colorParam = params.get('color');
    if (colorParam) {
      setSelectedColor(colorParam);
    }
  }, [location.search]);

  // Colors available in loaded accessories products
  const availableColors = useMemo(
    () => extractAvailableColors(accessoriesProducts),
    [accessoriesProducts]
  );

  const handleColorClick = (colorItem: AvailableColorItem) => {
    const active = (selectedColor || '').trim().toLowerCase();
    const isSelected = active === colorItem.name.toLowerCase() || active === colorItem.slug;
    const nextColor = isSelected ? '' : colorItem.name;
    setSelectedColor(nextColor);

    try {
      const params = new URLSearchParams(location.search);
      if (nextColor) params.set('color', nextColor);
      else params.delete('color');
      const qs = params.toString();
      navigate({ pathname: '/accessories', search: qs ? `?${qs}` : '' }, { replace: true });
    } catch (e) {}
  };

  // Filter products based on selected category, subcategory, and color
  const filteredProducts = accessoriesProducts.filter((p: any) => {
    if (selectedColor && !productMatchesColor(p, selectedColor)) {
      return false;
    }

    if (selectedCategory === 'all') return true;

    const productGender = (p as any).gender?.toLowerCase();
    const targetSub = String(selectedSubCategory || 'all').toLowerCase();

    const matchSub = (product: any) => {
      if (targetSub === 'all') return true;
      const candidates = [product.category, product.subcategory, product.subCategory, product.type, product.section];
      if (Array.isArray(product.tags)) candidates.push(...product.tags);
      for (const c of candidates.filter(Boolean)) {
        try {
          if (String(slugify(c)).toLowerCase().includes(targetSub)) return true;
        } catch (e) {}
        if (Array.isArray(c) && c.map(String).some((x: any) => String(slugify(x)).toLowerCase().includes(targetSub))) return true;
      }
      // fallback: product name
      if (String(slugify(product.name || '')).toLowerCase().includes(targetSub)) return true;
      return false;
    };

    if (selectedCategory === 'men' && (productGender === 'men' || productGender === 'unisex' || productGender === 'accessories' || !productGender)) return matchSub(p);
    if (selectedCategory === 'women' && (productGender === 'women' || productGender === 'unisex' || productGender === 'accessories' || !productGender)) return matchSub(p);
    if (selectedCategory === 'boys' && (productGender === 'boys' || productGender === 'kids' || productGender === 'unisex')) return matchSub(p);
    if (selectedCategory === 'girls' && (productGender === 'girls' || productGender === 'kids' || productGender === 'unisex')) return matchSub(p);

    return false;
  });

  // Category structure
  const categories = {
    men: {
      name: 'Men',
      subCategories: [
        { name: 'All', slug: 'all' },
        { name: 'Footwear', slug: 'footwear' },
        { name: 'Belts', slug: 'belts' },
        { name: 'Sunglasses', slug: 'sunglasses' },
        { name: 'Wallets', slug: 'wallets' },
        { name: 'Gloves', slug: 'gloves' },
        { name: 'Beanies', slug: 'beanies' },
        { name: 'Caps', slug: 'caps' },
        { name: 'Underwear', slug: 'underwear' },
        { name: 'Scarves', slug: 'scarves' },
        { name: 'Socks', slug: 'socks' },
        { name: 'Jewellery', slug: 'jewellery' },
      ]
    },
    women: {
      name: 'Women',
      subCategories: [
        { name: 'All', slug: 'all' },
        { name: 'Footwear', slug: 'footwear' },
        { name: 'Sunglasses', slug: 'sunglasses' },
        { name: 'Handbags', slug: 'handbags' },
        { name: 'Beanies', slug: 'beanies' },
        { name: 'Scarves', slug: 'scarves' },
        { name: 'Cape Shawls', slug: 'cape-shawls' },
        { name: 'Leg Warmers', slug: 'leg-warmers' },
        { name: 'Gloves', slug: 'gloves' },
        { name: 'Shawls', slug: 'shawls' },
        { name: 'Socks', slug: 'socks' },
        { name: 'Belts', slug: 'belts' },
      ]
    },
    boys: {
      name: 'Boys',
      subCategories: [
        { name: 'All', slug: 'all' },
        { name: 'Sunglasses', slug: 'sunglasses' },
        { name: 'Beanies', slug: 'beanies' },
        { name: 'Socks', slug: 'socks' },
        { name: 'Scarves', slug: 'scarves' },
      ]
    },
    girls: {
      name: 'Girls',
      subCategories: [
        { name: 'All', slug: 'all' },
        { name: 'Sunglasses', slug: 'sunglasses' },
        { name: 'Beanies', slug: 'beanies' },
        { name: 'Socks', slug: 'socks' },
        { name: 'Scarves', slug: 'scarves' },
      ]
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubCategory('all');
    setShowFilters(false);
  };

  const handleSubCategoryChange = (subCategory: string) => {
    setSelectedSubCategory(subCategory);
    setShowFilters(false);
  };

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  const { banner: accBanner } = usePageBanner('accessories_hero');

  const heroImageUrl = accBanner?.imageUrl || 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?q=80&w=1800&auto=format&fit=crop';
  const heroTitle = accBanner?.title || "ACCESSORIES";
  const heroSubtitle = accBanner?.subtitle || "Complete your look with our premium collection";

  return (
    <div className="w-full">
      {/* Hero Banner Section */}
      <section className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] mb-8 md:mb-12">
        <img
          src={heroImageUrl}
          alt={heroTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase">
                {heroTitle}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
          <Breadcrumb
            items={
              selectedCategory && selectedCategory !== 'all'
                ? [{ label: 'Home', to: '/' }, { label: 'Accessories', to: '/accessories' }, { label: `${selectedCategory.toUpperCase()} ACCESSORIES` }]
                : [{ label: 'Home', to: '/' }, { label: 'Accessories' }]
            }
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-lg text-sm font-medium transition ${
              showFilters
                ? 'border-black bg-black text-white shadow-sm'
                : 'border-gray-200 hover:bg-gray-50 text-gray-900 bg-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{showFilters ? 'Hide Categories' : 'Filter Categories'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Collapsible Sidebar */}
          {showFilters && (
            <aside className="w-full lg:w-64 flex-shrink-0 animate-fadeIn">
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm sticky top-24">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Categories</h2>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="p-1 text-gray-400 hover:text-black rounded transition"
                    title="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              
              {/* All Accessories */}
              <div className="mb-6">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`w-full text-left px-4 py-3 font-semibold uppercase text-sm tracking-wider transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  All Accessories
                </button>
              </div>

              {/* Men's Accessories */}
              <div className="mb-6">
                <button
                  onClick={() => handleCategoryChange('men')}
                  className={`w-full text-left px-4 py-3 font-semibold uppercase text-sm tracking-wider transition-colors ${
                    selectedCategory === 'men'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Men
                </button>
                {selectedCategory === 'men' && (
                  <div className="mt-2 ml-4 space-y-1">
                    {categories.men.subCategories.map((sub) => (
                      <button
                        key={sub.slug}
                        onClick={() => handleSubCategoryChange(sub.slug)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedSubCategory === sub.slug
                            ? 'text-black font-semibold bg-gray-100'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Women's Accessories */}
              <div className="mb-6">
                <button
                  onClick={() => handleCategoryChange('women')}
                  className={`w-full text-left px-4 py-3 font-semibold uppercase text-sm tracking-wider transition-colors ${
                    selectedCategory === 'women'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Women
                </button>
                {selectedCategory === 'women' && (
                  <div className="mt-2 ml-4 space-y-1">
                    {categories.women.subCategories.map((sub) => (
                      <button
                        key={sub.slug}
                        onClick={() => handleSubCategoryChange(sub.slug)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedSubCategory === sub.slug
                            ? 'text-black font-semibold bg-gray-100'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Boys' Accessories */}
              <div className="mb-6">
                <button
                  onClick={() => handleCategoryChange('boys')}
                  className={`w-full text-left px-4 py-3 font-semibold uppercase text-sm tracking-wider transition-colors ${
                    selectedCategory === 'boys'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Boys
                </button>
                {selectedCategory === 'boys' && (
                  <div className="mt-2 ml-4 space-y-1">
                    {categories.boys.subCategories.map((sub) => (
                      <button
                        key={sub.slug}
                        onClick={() => handleSubCategoryChange(sub.slug)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedSubCategory === sub.slug
                            ? 'text-black font-semibold bg-gray-100'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Girls' Accessories */}
              <div className="mb-6">
                <button
                  onClick={() => handleCategoryChange('girls')}
                  className={`w-full text-left px-4 py-3 font-semibold uppercase text-sm tracking-wider transition-colors ${
                    selectedCategory === 'girls'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Girls
                </button>
                {selectedCategory === 'girls' && (
                  <div className="mt-2 ml-4 space-y-1">
                    {categories.girls.subCategories.map((sub) => (
                      <button
                        key={sub.slug}
                        onClick={() => handleSubCategoryChange(sub.slug)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedSubCategory === sub.slug
                            ? 'text-black font-semibold bg-gray-100'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

          {/* Products Grid */}
          <main className="flex-1">
            {/* Active Filters Display */}
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2">
                {selectedCategory === 'all' 
                  ? 'All Accessories' 
                  : `${categories[selectedCategory as keyof typeof categories].name} Accessories`}
              </h2>
              {selectedSubCategory !== 'all' && (
                <p className="text-gray-600">
                  Showing: {categories[selectedCategory as keyof typeof categories].subCategories.find(s => s.slug === selectedSubCategory)?.name}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product: any) => (
                  <ProductCard key={productId(product)} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found matching your selection.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubCategory('all');
                    setSelectedColor('');
                    try {
                      navigate({ pathname: '/accessories' }, { replace: true });
                    } catch (e) {}
                  }}
                  className="mt-4 inline-block bg-black text-white px-6 py-3 font-semibold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
                >
                  View All Accessories
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {availableColors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 uppercase tracking-wider text-center">
            Shop by Color
          </h2>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {availableColors.map((colorItem) => {
              const active = (selectedColor || '').trim().toLowerCase();
              const isActive = active === colorItem.name.toLowerCase() || active === colorItem.slug;
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
            })}
          </div>
        </section>
      )}
    </div>
  );
}