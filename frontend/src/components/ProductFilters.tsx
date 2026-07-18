import React, { useState, useEffect } from 'react';
import { Slider } from './ui/Slider';
import { getColorName, normalizeHex } from '../utils/colorNames';
import { productsAPI, httpClient } from '../api';

interface ProductFiltersProps {
  onFilterChange: (filters: any) => void;
  colors?: string[];
  sizes?: string[];
  initialFilters?: any;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({ onFilterChange, colors = [], sizes = [], initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    category: '',
    priceRange: 50000,
    sizes: [] as string[],
    rating: 0,
    color: '',
    ...initialFilters
  });

  useEffect(() => {
    // Sync when parent supplies new initial filters (e.g., from URL)
    if (initialFilters && Object.keys(initialFilters).length) {
      setFilters((s) => ({ ...s, ...initialFilters }));
    }
  }, [initialFilters]);

  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [colorsList, setColorsList] = useState<string[]>(colors && colors.length ? colors : []);
  const [sizesList, setSizesList] = useState<string[]>(sizes && sizes.length ? sizes : []);
  const [dynamicGroups, setDynamicGroups] = useState<any[]>([]);
  const [dynamicSelections, setDynamicSelections] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;
    const ensureFacets = async () => {
      try {
        const res: any = await productsAPI.getFilters();
        if (!mounted) return;
        const d = res && (res.data || res) || {};
        if ((!sizes || (Array.isArray(sizes) && sizes.length === 0)) && Array.isArray(d.sizes) && d.sizes.length) {
          if (mounted) setSizesList(Array.from(new Set(d.sizes.flat())).map(String).filter(Boolean).sort());
        }
        if ((!colors || (Array.isArray(colors) && colors.length === 0)) && Array.isArray(d.colors) && d.colors.length) {
          if (mounted) setColorsList(Array.from(new Set(d.colors.flat())).map(String).filter(Boolean).sort());
        }
        if (Array.isArray(d.subcategories) && d.subcategories.length) setCategoriesList(d.subcategories.map(String));
      } catch (e) {
        // ignore
      }
    };
    ensureFacets();
    return () => { mounted = false; };
  }, []);

  // Load category-specific filter config when category changes
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const cat = filters.category || initialFilters?.category || '';
        if (!cat) {
          setDynamicGroups([]);
          return;
        }
        const slug = encodeURIComponent(String(cat).toLowerCase());
        const res: any = await httpClient.get(`/filters/config/${slug}`);
        const data = res && (res.data || res) || {};
        const groups = Array.isArray(data.groups) ? data.groups : [];
        if (!mounted) return;
        setDynamicGroups(groups || []);

        // initialize selections from initialFilters when present
        const init: Record<string, any> = {};
        for (const g of groups) {
          const key = g.slug;
          if (initialFilters && initialFilters[key] !== undefined) init[key] = initialFilters[key];
        }
        setDynamicSelections(prev => ({ ...init, ...prev }));
      } catch (e) {
        // ignore failures; keep existing facets
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, [filters.category, initialFilters]);

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleDynamicToggle = (group: any, value: any) => {
    const slug = group.slug;
    const type = group.type || 'multi-select';
    const current = dynamicSelections[slug];
    let next;
    if (type === 'single-select') {
      next = current === value ? '' : value;
    } else {
      // multi-select
      const arr = Array.isArray(current) ? current.slice() : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      next = arr;
    }
    setDynamicSelections(prev => ({ ...prev, [slug]: next }));
    // propagate into main filters object using group.slug as query key
    const propagated: any = {};
    propagated[slug] = next;
    handleFilterChange(propagated);
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
      rating: 0,
      color: ''
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
          {(categoriesList.length ? categoriesList : ['all']).map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange({ category: category === 'all' ? '' : category })}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (category === 'all' && !filters.category) || filters.category === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {String(category).charAt(0).toUpperCase() + String(category).slice(1)}
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
          {sizesList.length === 0 ? (
            <div className="text-sm text-gray-500">No sizes available</div>
          ) : (
            sizesList.map((size) => (
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
            ))
          )}
        </div>
      </div>

      {/* Color Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Color</h3>
        <div className="flex flex-wrap gap-2">
          {colorsList.length === 0 ? (
            <div className="text-sm text-gray-500">No colors available</div>
          ) : (
            colorsList.map((c) => {
              const raw = String(c || '');
              const key = raw.toLowerCase();
              const selected = filters.color && String(filters.color).toLowerCase() === key;
              const label = getColorName(raw);
              const hexNorm = normalizeHex(raw);
              const swatchColor = hexNorm ? `#${hexNorm}` : raw;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange({ color: selected ? '' : raw })}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                  }`}
                  aria-label={`Filter by color ${label}`}
                  aria-pressed={selected}
                  title={`Filter by color ${label}`}
                >
                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: swatchColor }} aria-hidden />
                  <span className="truncate max-w-[160px]">{label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Rating Filter */}
      {/* Dynamic Category-Specific Filter Groups */}
      {dynamicGroups && dynamicGroups.length > 0 && (
        <div className="mb-6">
          {dynamicGroups.map((group) => {
            const key = group.slug || group.name;
            const sel = dynamicSelections[key];
            const type = group.type || 'multi-select';
            return (
              <div key={key} className="mb-4">
                <h3 className="font-medium text-gray-900 mb-3">{group.name}</h3>
                {type === 'range' ? (
                  <div className="px-2">
                    <Slider
                      value={[sel || (group.meta && group.meta.max) || 0]}
                      onValueChange={([v]) => { setDynamicSelections(prev => ({ ...prev, [key]: v })); handleFilterChange({ [key]: v }); }}
                      max={(group.meta && group.meta.max) || 50000}
                      step={(group.meta && group.meta.step) || 1000}
                      className="mb-4"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{(group.meta && group.meta.min) || 0}</span>
                      <span>{String(sel || (group.meta && group.meta.max) || 0)}</span>
                      <span>{(group.meta && group.meta.max) || 50000}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(group.options) ? group.options : []).map((opt: any) => {
                      const val = opt.value || opt.slug || opt.label;
                      const selected = type === 'single-select' ? sel === val : Array.isArray(sel) && sel.indexOf(val) >= 0;
                      // color-type groups can provide meta.hex on option
                      const hex = opt.meta && opt.meta.hex ? `#${opt.meta.hex.replace(/^#/, '')}` : undefined;
                      return (
                        <button
                          key={val}
                          onClick={() => handleDynamicToggle(group, val)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'}`}
                          title={opt.label || val}
                        >
                          {hex ? (<span className="inline-block w-4 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: hex }} />) : null}
                          <span className="align-middle">{opt.label || val}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                    className={`${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
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

export default ProductFilters;

