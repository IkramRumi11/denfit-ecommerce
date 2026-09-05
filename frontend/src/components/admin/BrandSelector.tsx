// frontend/src/components/admin/BrandSelector.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CURATED_BRANDS, normalizeBrandName, CuratedBrand } from '../../utils/brandConstants';
import { Tag, ChevronDown, Plus, Check, Sparkles, X } from 'lucide-react';

interface BrandSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  label?: string;
}

export const BrandSelector: React.FC<BrandSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  required = false,
  label = 'Brand'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedCurrentValue = useMemo(() => normalizeBrandName(value), [value]);

  const filteredBrands = useMemo(() => {
    if (!searchTerm.trim()) return CURATED_BRANDS;
    const term = searchTerm.toLowerCase();
    return CURATED_BRANDS.filter(b => b.name.toLowerCase().includes(term) || b.category.toLowerCase().includes(term));
  }, [searchTerm]);

  const groupedBrands = useMemo(() => {
    const groups: { [key: string]: CuratedBrand[] } = {
      'House Brand': [],
      'Global Brands': [],
      'Pakistani Fashion': []
    };
    filteredBrands.forEach(b => {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    });
    return groups;
  }, [filteredBrands]);

  const handleSelectBrand = (brandName: string) => {
    const normalized = normalizeBrandName(brandName);
    onChange(normalized);
    setIsOpen(false);
    setSearchTerm('');
    setIsManualMode(false);
  };

  const handleManualSubmit = () => {
    if (searchTerm.trim()) {
      const normalized = normalizeBrandName(searchTerm.trim());
      onChange(normalized);
    }
    setIsOpen(false);
    setSearchTerm('');
    setIsManualMode(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const isCuratedMatch = useMemo(() => {
    return CURATED_BRANDS.some(b => b.name.toLowerCase() === value.trim().toLowerCase());
  }, [value]);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          <span className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-gray-500" />
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
        </label>
        
        {/* Quick select House Brand button */}
        {value !== 'DENFiT' && !disabled && (
          <button
            type="button"
            onClick={() => handleSelectBrand('DENFiT')}
            className="text-xs font-semibold text-black hover:text-gray-700 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition"
            title="Set to House Brand DENFiT"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick DENFiT
          </button>
        )}
      </div>

      {/* Main trigger / input */}
      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen) {
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer transition ${
            error
              ? 'border-red-500 bg-red-50/20'
              : isOpen
              ? 'border-black ring-1 ring-black bg-white'
              : 'border-gray-300 hover:border-gray-400 bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {normalizedCurrentValue ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-black text-white">
                {normalizedCurrentValue === 'DENFiT' && <Sparkles className="w-3 h-3 text-amber-300" />}
                {normalizedCurrentValue}
                {!isCuratedMatch && normalizedCurrentValue && (
                  <span className="ml-1 text-[10px] text-gray-300 font-normal lowercase">(custom)</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Select or enter brand...</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {normalizedCurrentValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="Clear brand"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown panel */}
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Search and manual entry input */}
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) setIsManualMode(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  placeholder="Search curated brands or enter custom brand..."
                  className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Custom manual brand create button if search term doesn't exactly match curated */}
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="mt-1.5 w-full flex items-center justify-between text-xs font-semibold text-black bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-md transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    Use Custom Brand: <span className="font-bold underline">{searchTerm.trim()}</span>
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Press Enter</span>
                </button>
              )}
            </div>

            {/* Curated brands listing */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-1">
              {Object.entries(groupedBrands).map(([category, brands]) => {
                if (!brands.length) return null;
                return (
                  <div key={category} className="py-1">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {category === 'House Brand' ? '👑 House Brand' : category === 'Global Brands' ? '🌍 Global Brands' : '🇵🇰 Pakistani Fashion'}
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {brands.map((b) => {
                        const isSelected = normalizedCurrentValue.toLowerCase() === b.name.toLowerCase();
                        return (
                          <button
                            key={b.name}
                            type="button"
                            onClick={() => handleSelectBrand(b.name)}
                            className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md text-left transition ${
                              isSelected
                                ? 'bg-black text-white font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredBrands.length === 0 && !searchTerm && (
                <div className="px-3 py-4 text-center text-xs text-gray-500">
                  No brands available.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default BrandSelector;
