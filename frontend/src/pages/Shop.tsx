// frontend/src/pages/Shop.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Grid, List, Star } from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import { ProductFilters } from '../components/ProductFilters';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { mockProducts } from '../data/mockProducts';
import { useLocation } from 'react-router-dom';
import { slugify, primaryImage } from '../utils/productHelpers';

export const Shop: React.FC = () => {
  const [products] = useState(mockProducts);
  const [filteredProducts, setFilteredProducts] = useState(mockProducts);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  
  // FIX: Use CartContext properly
  const { addItem } = useCart();
  const { showToast } = useToast();

  // FIX: Proper add to cart function that actually adds to cart
  const handleAddToCart = (product: any, size: string = 'M') => {
    try {
      console.log('🛒 Adding to cart:', product.name, 'Size:', size);
      
      // Call the actual CartContext function
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage(product),
        size: size,
        quantity: 1
      });
      
      showToast('Added to cart!', 'success');
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleFilterChange = (filters: any) => {
    let filtered = [...products];

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Price filter
    if (filters.priceRange) {
      filtered = filtered.filter(product => product.price <= filters.priceRange);
    }

    // Size filter
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(product =>
        product.sizes.some(size => filters.sizes.includes(size))
      );
    }

    // Rating filter
    if (filters.rating) {
      filtered = filtered.filter(product => product.rating >= filters.rating);
    }

    setFilteredProducts(filtered);
  };

  // Apply query params (gender, type) from URL for direct navigation via header/mega menu
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gender = params.get('gender');
    const type = params.get('type');

    if (!gender && !type) return;

    let filtered = [...products];

    if (gender) {
      // match against product.gender (we added this to mockProducts)
      filtered = filtered.filter((p: any) => String(p.gender).toLowerCase() === gender.toLowerCase());
    }

  if (type) {
      // type comes from mega menu items; product.category holds subcategory like 't-shirts'
      // protect against malformed URI sequences in query params
      let decoded = type;
      try {
        decoded = decodeURIComponent(type as string);
      } catch (err) {
        // fallback: use raw value
        decoded = type as string;
      }
      decoded = decoded.toLowerCase();
      // compare against slugified product.category to tolerate spaces/& etc.
      filtered = filtered.filter((p: any) => slugify(String(p.category)) === slugify(decoded));
    }

    setFilteredProducts(filtered);
  }, [location.search, products]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop</h1>
              <p className="text-gray-600 text-sm mt-1">
                {filteredProducts.length} products found
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <ProductFilters onFilterChange={handleFilterChange} />
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(size) => handleAddToCart(product, size)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm p-6 flex gap-6"
                  >
        <img
          src={primaryImage(product)}
                          alt={product.name}
                          className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" fill="%23f3f4f6"/></svg>' }}
                        />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {product.name}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900">
                            {product.rating}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          Rs {product.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="btn-primary"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found matching your filters.</p>
                <button
                  onClick={() => setFilteredProducts(products)}
                  className="btn-secondary mt-4"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
