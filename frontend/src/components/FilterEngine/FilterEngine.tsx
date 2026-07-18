/**
 * FilterEngine — The unified, dynamic filter component for all DENFiT product pages.
 *
 * Features:
 * - Fetches faceted counts from /filters/facets API
 * - Loads category-specific filter config from /filters/config/:categorySlug
 * - Renders filter sections dynamically based on FilterGroup type
 * - Full URL sync via useSearchParams
 * - Desktop sidebar + Mobile drawer modes
 * - Active filter chips with individual remove
 * - Debounced product fetching
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Search, Star, Check } from 'lucide-react';
import { filtersAPI, productsAPI } from '../../api';
import { getColorName, normalizeHex } from '../../utils/colorNames';
import { Slider } from '../ui/Slider';

// ─── Types ───
interface FilterGroup {
  _id: string;
  name: string;
  slug: string;
  type: 'multi-select' | 'single-select' | 'range' | 'boolean' | 'color-swatch';
  displayOrder: number;
  isGlobal: boolean;
  options: FilterOption[];
}

interface FilterOption {
  _id: string;
  value: string;
  slug: string;
  label: string;
  meta?: { hex?: string; swatchImage?: string; region?: string; gender?: string };
}

interface FacetValue {
  value: string;
  hex?: string;
  count: number;
}

interface FilterEngineProps {
  /** Gender context: 'men', 'women', 'kids', or undefined for all */
  gender?: string;
  /** Active subcategory slug for category-specific filters */
  categorySlug?: string;
  /** Search query */
  search?: string;
  /** Callback when products change */
  onProductsChange: (products: any[]) => void;
  /** Callback when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Callback when total count changes */
  onTotalChange?: (total: number) => void;
  /** Callback when pagination changes */
  onPaginationChange?: (pagination: { current: number; pages: number; total: number }) => void;
  /** Additional fixed query params (e.g. featured=true for a specific page) */
  fixedParams?: Record<string, any>;
  /** Products per page */
  pageSize?: number;
  /** Hide the filter sidebar and only use URL-driven state (useful for minimal pages) */
  headless?: boolean;
}

// Known filter slugs that map to top-level product query params
const DIRECT_PARAM_MAP: Record<string, string> = {
  'brand': 'brand',
  'color': 'colors',
  'rating': 'minRating',
  'availability': 'availability',
  'discount': 'discount',
};

// Built-in filter slugs that are handled specially (not via attributes map)
const BUILTIN_SLUGS = new Set([
  'brand', 'color', 'price', 'rating', 'availability', 'discount',
  'clothing-size', 'shoe-size-men', 'shoe-size-women', 'shoe-size-kids'
]);

// Size-related slugs get mapped to the `sizes` query param
const SIZE_SLUGS = new Set(['clothing-size', 'shoe-size-men', 'shoe-size-women', 'shoe-size-kids']);

interface CheckboxFilterSectionProps {
  group: FilterGroup;
  options: Array<{ value: string; label: string; slug: string; count: number; meta?: any }>;
  activeValues: string[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onToggle: (key: string, value: string) => void;
  onSetFilter: (key: string, values: string[]) => void;
}

const CheckboxFilterSection: React.FC<CheckboxFilterSectionProps> = ({
  group,
  options,
  activeValues,
  searchTerm,
  onSearchChange,
  onToggle,
  onSetFilter,
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? options : options.slice(0, 8);
  const isSingle = group.type === 'single-select';
  const showSearch = options.length > 8;

  return (
    <div className="space-y-1.5">
      {showSearch && (
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${group.name.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      )}
      {visibleOptions.map(opt => {
        const isActive = activeValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => {
              if (isSingle) {
                onSetFilter(group.slug, isActive ? [] : [opt.value]);
              } else {
                onToggle(group.slug, opt.value);
              }
            }}
            className={`flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all ${
              isActive
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className={`w-4 h-4 rounded ${isSingle ? 'rounded-full' : ''} border-2 flex items-center justify-center transition-all ${
              isActive ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
            }`}>
              {isActive && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="flex-1 truncate">{opt.label}</span>
            {opt.count > 0 && <span className="text-xs text-gray-400 flex-shrink-0">({opt.count})</span>}
          </button>
        );
      })}
      {options.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 px-2.5"
        >
          {showAll ? 'Show Less' : `Show All (${options.length})`}
        </button>
      )}
    </div>
  );
};

export const FilterEngine: React.FC<FilterEngineProps> = ({
  gender,
  categorySlug,
  search,
  onProductsChange,
  onLoadingChange,
  onTotalChange,
  onPaginationChange,
  fixedParams,
  pageSize = 24,
  headless = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── State ───
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [facets, setFacets] = useState<Record<string, FacetValue[]>>({});
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 50000 });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const fetchRef = useRef(0);
  const initialLoadDone = useRef(false);

  // ─── Derive active filters from URL ───
  const activeFilters = useMemo(() => {
    const filters: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (['page', 'sort', 'limit', 'gender', 'search'].includes(key)) return;
      const existing = filters[key] || [];
      // Support comma-separated values in a single param
      const parts = value.split(',').map(s => s.trim()).filter(Boolean);
      filters[key] = [...existing, ...parts];
    });
    return filters;
  }, [searchParams]);

  // ─── Load filter config + facets ───
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      setFacetsLoading(true);
      try {
        // Load facets and config in parallel
        const [facetsRes, configRes] = await Promise.all([
          filtersAPI.getFacets({ gender, categorySlug, search }),
          categorySlug
            ? filtersAPI.getConfig(categorySlug, gender)
            : filtersAPI.getGroups(true)
        ]);

        if (cancelled) return;

        // Process facets
        const facetsData = facetsRes?.data || facetsRes || {};
        setFacets(facetsData.facets || {});
        if (facetsData.priceRange) setPriceRange(facetsData.priceRange);

        // Process filter groups
        let groups: FilterGroup[] = [];
        if (categorySlug && configRes?.data?.groups) {
          groups = configRes.data.groups;
        } else if (configRes?.data) {
          groups = Array.isArray(configRes.data) ? configRes.data : [];
        }

        // Ensure price group exists (always shown)
        const hasPriceGroup = groups.some(g => g.slug === 'price');
        if (!hasPriceGroup) {
          groups.push({
            _id: 'builtin-price',
            name: 'Price',
            slug: 'price',
            type: 'range',
            displayOrder: 3,
            isGlobal: true,
            options: []
          });
        }

        setFilterGroups(groups);

        // Auto-expand first 5 groups
        const defaultExpanded = new Set(groups.slice(0, 5).map(g => g.slug));
        setExpandedSections(defaultExpanded);
      } catch (err) {
        console.error('FilterEngine: Failed to load filters', err);
      } finally {
        if (!cancelled) setFacetsLoading(false);
      }
    };

    loadFilters();
    return () => { cancelled = true; };
  }, [gender, categorySlug, search]);

  // ─── Fetch products when filters change ───
  useEffect(() => {
    const currentFetch = ++fetchRef.current;

    const fetchProducts = async () => {
      onLoadingChange?.(true);
      try {
        const params: Record<string, any> = {
          ...fixedParams,
          page: Number(searchParams.get('page')) || 1,
          limit: pageSize,
        };

        // Apply context
        if (gender) params.gender = gender;
        if (search) params.search = search;
        if (searchParams.get('sort')) params.sort = searchParams.get('sort');

        // Map active filters to API params
        for (const [key, values] of Object.entries(activeFilters)) {
          if (!values.length) continue;

          if (key === 'minPrice' || key === 'maxPrice') {
            params[key] = values[0];
          } else if (SIZE_SLUGS.has(key)) {
            // Size filters → sizes param
            params.sizes = (params.sizes ? [].concat(params.sizes) : []).concat(values).join(',');
          } else if (key === 'color') {
            params.colors = values.join(',');
          } else if (key === 'rating') {
            params.minRating = values[0];
          } else if (key === 'availability') {
            params.availability = values.join(',');
          } else if (key === 'brand') {
            params.brand = values.join(',');
          } else if (key === 'discount') {
            params.discount = Math.max(...values.map(Number));
          } else if (key === 'discountTags') {
            params.discountTags = values.join(',');
          } else if (key === 'category' || key === 'subcategory') {
            params.category = values[0];
          } else {
            // Dynamic attribute filter
            params[key] = values.join(',');
          }
        }

        const res: any = await productsAPI.getAll(params);
        if (currentFetch !== fetchRef.current) return; // stale

        const items = res?.data?.products || res?.products || [];
        const normalized = items.map((p: any) => ({
          ...p,
          id: p.id || p._id || p.slug || ''
        }));

        onProductsChange(normalized);
        onTotalChange?.(res?.data?.pagination?.total || res?.total || items.length);
        onPaginationChange?.(res?.data?.pagination || { current: 1, pages: 1, total: items.length });
      } catch (err) {
        console.error('FilterEngine: Failed to fetch products', err);
      } finally {
        if (currentFetch === fetchRef.current) {
          onLoadingChange?.(false);
          initialLoadDone.current = true;
        }
      }
    };

    // Small debounce on filter changes to avoid hammering API
    const timer = initialLoadDone.current ? setTimeout(fetchProducts, 150) : (() => { fetchProducts(); return null; })();
    return () => { if (timer) clearTimeout(timer); };
  }, [searchParams, gender, search, categorySlug, fixedParams, pageSize]);

  // ─── Filter mutation helpers ───
  const setFilter = useCallback((key: string, values: string[]) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      if (values.length) {
        next.set(key, values.join(','));
      }
      // Reset page when filters change
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleFilterValue = useCallback((key: string, value: string) => {
    const current = activeFilters[key] || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilter(key, next);
  }, [activeFilters, setFilter]);

  const clearFilter = useCallback((key: string) => {
    setFilter(key, []);
  }, [setFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      // Keep sort and non-filter params
      const keep = prev.get('sort');
      if (keep) next.set('sort', keep);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  // ─── Section toggle ───
  const toggleSection = (slug: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // ─── Active filter count ───
  const activeFilterCount = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

  // ─── Get facet counts for a group ───
  const getFacetData = (group: FilterGroup): FacetValue[] => {
    const key = group.slug;
    // Direct facet match: normalize different shapes into an array
    const raw = facets[key];
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      // Object shape like { "4": 12, "3": 8 } -> [{ value: '4', count: 12 }, ...]
      return Object.keys(raw).map(k => ({ value: String(k), count: (raw as any)[k] }));
    }

    // Size facets are under 'size' key
    const sizeRaw = facets['size'];
    if (Array.isArray(sizeRaw)) return sizeRaw;
    if (sizeRaw && typeof sizeRaw === 'object') {
      return Object.keys(sizeRaw).map(k => ({ value: String(k), count: (sizeRaw as any)[k] }));
    }

    return [];
  };

  // ─── Render a single filter section ───
  const renderFilterSection = (group: FilterGroup) => {
    const isExpanded = expandedSections.has(group.slug);
    const activeValues = activeFilters[group.slug] || [];
    const facetData = getFacetData(group);
    const searchTerm = sectionSearch[group.slug] || '';

    // Merge options with facet counts
    let displayOptions: { value: string; label: string; slug: string; count: number; meta?: any }[] = [];

    if (group.options && group.options.length) {
      displayOptions = group.options.map(opt => {
        const facet = facetData.find(f =>
          f.value?.toLowerCase() === opt.value?.toLowerCase() ||
          f.value?.toLowerCase() === opt.slug?.toLowerCase()
        );
        return {
          value: opt.slug || opt.value,
          label: opt.label || opt.value,
          slug: opt.slug,
          count: facet?.count || 0,
          meta: opt.meta
        };
      });
    } else if (facetData.length) {
      // No predefined options — use facet data directly
      displayOptions = facetData.map(f => ({
        value: f.value,
        label: f.value,
        slug: f.value,
        count: f.count,
        meta: f.hex ? { hex: f.hex } : undefined
      }));
    }

    // Filter by search within section
    if (searchTerm) {
      displayOptions = displayOptions.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ─── Render by type ───
    if (group.type === 'range' && group.slug === 'price') {
      return renderPriceFilter();
    }

    if (group.type === 'color-swatch') {
      return renderColorFilter(group.slug, displayOptions, activeValues);
    }

    if (group.type === 'boolean') {
      return renderBooleanFilter(group.slug, displayOptions, activeValues);
    }

    if (group.slug === 'rating') {
      return renderRatingFilter(activeValues);
    }

    // Default: multi-select / single-select checkboxes
    return renderCheckboxFilter(group, displayOptions, activeValues, searchTerm);
  };

  // ─── Price Filter ───
  const renderPriceFilter = () => {
    const currentMin = Number(activeFilters['minPrice']?.[0]) || priceRange.min;
    const currentMax = Number(activeFilters['maxPrice']?.[0]) || priceRange.max;

    const presets = [
      { label: `Under Rs 2,000`, min: 0, max: 2000 },
      { label: `Rs 2,000 – 5,000`, min: 2000, max: 5000 },
      { label: `Rs 5,000 – 10,000`, min: 5000, max: 10000 },
      { label: `Rs 10,000+`, min: 10000, max: priceRange.max },
    ];

    return (
      <div className="space-y-3">
        <div className="px-1">
          <Slider
            value={[currentMax]}
            onValueChange={([val]) => {
              setFilter('maxPrice', [String(val)]);
            }}
            min={priceRange.min}
            max={priceRange.max}
            step={500}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Rs {priceRange.min.toLocaleString()}</span>
            <span className="font-medium text-gray-800">Rs {currentMax.toLocaleString()}</span>
            <span>Rs {priceRange.max.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  if (p.min > 0) next.set('minPrice', String(p.min));
                  else next.delete('minPrice');
                  next.set('maxPrice', String(p.max));
                  next.delete('page');
                  return next;
                }, { replace: true });
              }}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                currentMin === p.min && currentMax === p.max
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ─── Color Filter ───
  const renderColorFilter = (slug: string, options: typeof displayOptions, activeValues: string[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = activeValues.includes(opt.value);
          const hex = opt.meta?.hex || normalizeHex(opt.value);
          const displayHex = hex ? (hex.startsWith('#') ? hex : `#${hex}`) : '#ccc';
          const isLight = hex && ['fff', 'ffffff', 'ffff', 'fafafa'].some(l => hex.toLowerCase().replace('#', '').startsWith(l));

          return (
            <button
              key={opt.value}
              onClick={() => toggleFilterValue(slug, opt.value)}
              className={`group relative flex flex-col items-center gap-1 transition-all`}
              title={`${opt.label}${opt.count ? ` (${opt.count})` : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                  isActive
                    ? 'border-gray-900 scale-110 shadow-md'
                    : `${isLight ? 'border-gray-300' : 'border-transparent'} hover:scale-105`
                }`}
                style={{ backgroundColor: displayHex.startsWith('linear') ? undefined : displayHex, background: displayHex.startsWith('linear') ? displayHex : undefined }}
              >
                {isActive && (
                  <Check size={14} className={isLight ? 'text-gray-800' : 'text-white'} strokeWidth={3} />
                )}
              </div>
              <span className="text-[10px] text-gray-500 max-w-[48px] truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Rating Filter ───
  const renderRatingFilter = (activeValues: string[]) => {
    const ratingFacets = facets['rating'] || {};
    return (
      <div className="space-y-1.5">
        {[4, 3, 2, 1].map(r => {
          const count = typeof ratingFacets === 'object' ? (ratingFacets as any)[String(r)] || 0 : 0;
          const isActive = activeValues.includes(String(r));
          return (
            <button
              key={r}
              onClick={() => setFilter('rating', isActive ? [] : [String(r)])}
              className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={13} className={s <= r ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                ))}
              </div>
              <span>& Up</span>
              {count > 0 && <span className="text-xs text-gray-400 ml-auto">({count})</span>}
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Boolean Filter ───
  const renderBooleanFilter = (slug: string, options: any[], activeValues: string[]) => {
    return (
      <div className="space-y-1.5">
        {options.map(opt => {
          const isActive = activeValues.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleFilterValue(slug, opt.value)}
              className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                isActive ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}>
                {isActive && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span>{opt.label}</span>
              {opt.count > 0 && <span className="text-xs text-gray-400 ml-auto">({opt.count})</span>}
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Checkbox Filter (multi/single select) ───
  const renderCheckboxFilter = (group: FilterGroup, options: any[], activeValues: string[], searchTerm: string) => {
    return (
      <CheckboxFilterSection
        group={group}
        options={options}
        activeValues={activeValues}
        searchTerm={searchTerm}
        onSearchChange={(value) => setSectionSearch(prev => ({ ...prev, [group.slug]: value }))}
        onToggle={toggleFilterValue}
        onSetFilter={setFilter}
      />
    );
  };

  // ─── Active Filters Chips ───
  const renderActiveFilters = () => {
    if (!hasActiveFilters) return null;

    const chips: { key: string; value: string; label: string }[] = [];
    for (const [key, values] of Object.entries(activeFilters)) {
      for (const val of values) {
        let label = val;
        // Find friendly label from filter groups
        for (const g of filterGroups) {
          if (g.slug === key) {
            const opt = g.options?.find(o => o.slug === val || o.value === val);
            if (opt) label = opt.label || opt.value;
            break;
          }
        }
        if (key === 'minPrice') label = `Min: Rs ${Number(val).toLocaleString()}`;
        if (key === 'maxPrice') label = `Max: Rs ${Number(val).toLocaleString()}`;
        if (key === 'rating') label = `${val}★ & Up`;

        chips.push({ key, value: val, label });
      }
    }

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((chip, i) => (
          <span
            key={`${chip.key}-${chip.value}-${i}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200"
          >
            <span className="text-gray-400 font-medium capitalize">{chip.key.replace(/-/g, ' ')}:</span>
            <span className="font-medium">{chip.label}</span>
            <button
              onClick={() => {
                const remaining = (activeFilters[chip.key] || []).filter(v => v !== chip.value);
                setFilter(chip.key, remaining);
              }}
              className="ml-0.5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <button
          onClick={clearAllFilters}
          className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1.5 transition-colors"
        >
          Clear All
        </button>
      </div>
    );
  };

  // ─── Desktop Sidebar ───
  const renderSidebar = () => {
    if (facetsLoading) {
      return (
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gray-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Sections */}
        {filterGroups.map(group => (
          <div key={group.slug} className="border-b border-gray-50 last:border-0">
            <button
              onClick={() => toggleSection(group.slug)}
              className="flex items-center justify-between w-full py-3.5 text-sm font-medium text-gray-800 hover:text-gray-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                {group.name}
                {(activeFilters[group.slug]?.length || 0) > 0 && (
                  <span className="bg-gray-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilters[group.slug]?.length}
                  </span>
                )}
              </span>
              {expandedSections.has(group.slug) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.has(group.slug) && (
              <div className="pb-3">
                {renderFilterSection(group)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ─── Mobile Drawer ───
  const renderMobileDrawer = () => {
    if (!mobileOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Clear All
                </button>
              )}
              <button onClick={() => setMobileOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {renderSidebar()}
          </div>
          {/* Apply button */}
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={() => setMobileOpen(false)}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
            >
              Show Results {facets?.totalProducts ? `(${facets.totalProducts})` : ''}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Mobile filter trigger button (rendered externally) ───
  const renderMobileTrigger = () => (
    <button
      onClick={() => setMobileOpen(true)}
      className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-all shadow-sm"
    >
      <SlidersHorizontal size={16} />
      Filters
      {activeFilterCount > 0 && (
        <span className="bg-gray-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  );

  if (headless) return null;

  return (
    <>
      {/* Active Filter Chips — rendered above the product grid */}
      {renderActiveFilters()}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0">
        <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm max-h-[calc(100vh-3rem)] overflow-y-auto">
          {renderSidebar()}
        </div>
      </aside>

      {/* Mobile Trigger */}
      {renderMobileTrigger()}

      {/* Mobile Drawer */}
      {renderMobileDrawer()}
    </>
  );
};

// Re-export for external use
export { type FilterEngineProps };
export default FilterEngine;
