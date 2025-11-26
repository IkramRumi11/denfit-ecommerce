import React, { useState } from 'react';
import { Slider } from './ui/Slider';

interface ProductFiltersProps {
  onFilterChange: (filters: any) => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    category: '',
    priceRange: 50000,
    sizes: [] as string[],
    rating: 0
  });

  const categories = ['all', 't-shirts', 'hoodies', 'pants', 'shorts', 'accessories'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter(s => s !== size)
      : [...filters.sizes, size];
    handleFilterChange({ sizes: newSizes });
  };

  const clearFilters = () => {
    const clearedFilters = {
      category: '',
      priceRange: 50000,
      sizes: [],
      rating: 0
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange({ category: category === 'all' ? '' : category })}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (category === 'all' && !filters.category) || filters.category === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Price Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Price</h3>
        <div className="px-2">
          <Slider
            value={[filters.priceRange]}
            onValueChange={([value]) => handleFilterChange({ priceRange: value })}
            max={50000}
            step={1000}
            className="mb-4"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Rs 0</span>
            <span>Rs {filters.priceRange.toLocaleString()}</span>
            <span>Rs 50,000</span>
          </div>
        </div>
      </div>

      {/* Size Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeToggle(size)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filters.sizes.includes(size)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => handleFilterChange({ rating })}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.rating === rating
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span>& Up</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
