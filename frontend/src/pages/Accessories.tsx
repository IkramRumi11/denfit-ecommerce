import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { productId, slugify } from '../utils/productHelpers';
import { productsAPI } from '../api';
import megaMenuData from '../data/megaMenuData';

export default function Accessories(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load products and derive accessories set client-side so items classified as "wallets", "watches" etc. are included
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

  // Filter products based on selected category
  const filteredProducts = accessoriesProducts.filter((p: any) => {
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
    setIsMobileSidebarOpen(false);
  };

  const handleSubCategoryChange = (subCategory: string) => {
    setSelectedSubCategory(subCategory);
    setIsMobileSidebarOpen(false);
  };

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  return (
    <div className="w-full">
      {/* Hero Banner Section */}
      <section className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] mb-8 md:mb-12">
        <img
          src="https://images.unsplash.com/photo-1556306535-0f09a537f0a3?q=80&w=1800&auto=format&fit=crop"
          alt="Accessories Collection"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 tracking-[0.2em] uppercase">
                ACCESSORIES
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6 md:mb-8">
                Complete your look with our premium collection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="w-full bg-black text-white px-6 py-3 font-semibold uppercase text-sm tracking-wider flex items-center justify-between"
            >
              <span>Filter Categories</span>
              <svg
                className={`w-5 h-5 transform transition-transform ${isMobileSidebarOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Sidebar */}
          <aside className={`lg:w-64 flex-shrink-0 ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6 uppercase tracking-wider">Categories</h2>
              
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
                <p className="text-gray-500 text-lg">No products found in this category.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubCategory('all');
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
    </div>
  );
}