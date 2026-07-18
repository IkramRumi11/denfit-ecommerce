import React, { useState, useEffect } from 'react';
import {
  Check, X, Grid, List, Shirt, Shoe,
  Users, Globe, Zap, Filter, Plus
} from 'lucide-react';
import { getCategoryGroup, getStandardSizes } from '../../utils/sizeRules';

interface ProductSizeSelectorProps {
  category: string;
  subcategory: string;
  gender: 'men' | 'women' | 'kids' | 'unisex';
  selectedSizes: string[];
  onSizesChange: (sizes: string[]) => void;
  displayMode?: 'boxes' | 'dropdown';
  allowCustom?: boolean;
}

interface SizeOption {
  value: string;
  label: string;
  isCustom?: boolean;
  category?: string;
  region?: string;
}

const ProductSizeSelector: React.FC<ProductSizeSelectorProps> = ({
  category,
  subcategory,
  gender,
  selectedSizes,
  onSizesChange,
  displayMode = 'boxes',
  allowCustom = true
}) => {
  const [mode, setMode] = useState<'boxes' | 'dropdown'>(displayMode);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [customSizes, setCustomSizes] = useState<SizeOption[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCustomSize, setNewCustomSize] = useState('');
  
  // Use centralized size rules to compute size options
  useEffect(() => {
    const categoryGroup = getCategoryGroup(category, subcategory);
    const sizes = getStandardSizes(categoryGroup, gender);
    const options: SizeOption[] = sizes.map(s => ({ value: s, label: s, category: categoryGroup }));
    setSizeOptions(options);
  }, [category, subcategory, gender]);

  const isSizeAvailable = (sizeValue: string) => selectedSizes.includes(sizeValue);

  const toggleSize = (sizeValue: string) => {
    const newSizes = isSizeAvailable(sizeValue)
      ? selectedSizes.filter(s => s !== sizeValue)
      : [...selectedSizes, sizeValue];
    onSizesChange(newSizes);
  };

  const quickActions = [
    {
      label: 'Select All',
      icon: <Check className="w-4 h-4" />,
      action: () => onSizesChange([...sizeOptions, ...customSizes].map(s => s.value))
    },
    { label: 'Clear All', icon: <X className="w-4 h-4" />, action: () => onSizesChange([]) },
    { label: 'Standard Only', icon: <Filter className="w-4 h-4" />, action: () => onSizesChange(sizeOptions.map(s => s.value)) },
    { label: 'Gender Filter', icon: <Users className="w-4 h-4" />, action: () => {
      const genderSpecific = sizeOptions.filter(opt => {
        if (gender === 'women') return !['XXXL', 'XXL'].includes(opt.value);
        if (gender === 'men') return !['XXS', 'XS'].includes(opt.value);
        return true;
      }).map(s => s.value);
      onSizesChange(genderSpecific);
    }}
  ];

  const addCustomSize = () => {
    if (!newCustomSize.trim()) return;
    const customSize: SizeOption = { value: `CUSTOM_${newCustomSize.toUpperCase()}`, label: newCustomSize, isCustom: true };
    setCustomSizes([...customSizes, customSize]);
    onSizesChange([...selectedSizes, customSize.value]);
    setNewCustomSize('');
    setShowCustomInput(false);
  };

  const removeCustomSize = (sizeValue: string) => {
    setCustomSizes(customSizes.filter(s => s.value !== sizeValue));
    onSizesChange(selectedSizes.filter(s => s !== sizeValue));
  };

  const allSizes = [...sizeOptions, ...customSizes];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Size Management</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Shirt className="w-4 h-4" />{getCategoryGroup().toUpperCase()}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{gender.toUpperCase()}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{sizeOptions[0]?.region || 'Standard'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setMode('boxes')} className={`px-3 py-2 flex items-center gap-2 ${mode === 'boxes' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><Grid className="w-4 h-4" />Boxes</button>
            <button onClick={() => setMode('dropdown')} className={`px-3 py-2 flex items-center gap-2 ${mode === 'dropdown' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><List className="w-4 h-4" />Dropdown</button>
          </div>
          {allowCustom && (<button onClick={() => setShowCustomInput(!showCustomInput)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Plus className="w-4 h-4" />Custom Size</button>)}
        </div>
      </div>

      {showCustomInput && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <input type="text" value={newCustomSize} onChange={(e) => setNewCustomSize(e.target.value)} placeholder="Enter custom size name (e.g., 'Small Petite')" className="flex-1 px-3 py-2 border rounded-lg" onKeyPress={(e) => e.key === 'Enter' && addCustomSize()} />
            <button onClick={addCustomSize} className="px-4 py-2 bg-green-600 text-white rounded-lg">Add</button>
            <button onClick={() => setShowCustomInput(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">{quickActions.map((action, index) => (<button key={index} onClick={action.action} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{action.icon}<span>{action.label}</span></button>))}</div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="text-center"><div className="text-2xl font-bold text-green-600">{selectedSizes.length}</div><div className="text-sm text-gray-600">Available</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-gray-400">{allSizes.length - selectedSizes.length}</div><div className="text-sm text-gray-600">Unavailable</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-blue-600">{customSizes.length}</div><div className="text-sm text-gray-600">Custom</div></div>
        </div>
        <div className="text-sm text-gray-600">Total: {allSizes.length} sizes</div>
      </div>

      <div>
        {mode === 'dropdown' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium">Select Available Sizes (Multiple Selection)</label>
            <select multiple className="w-full min-h-[200px] border rounded-lg p-3" value={selectedSizes} onChange={(e) => onSizesChange(Array.from(e.target.selectedOptions).map(o => o.value))}>
              {allSizes.map((size, index) => (<option key={index} value={size.value} className={selectedSizes.includes(size.value) ? 'text-blue-600 font-medium' : 'text-gray-500'}>{size.label}{size.isCustom ? ' (Custom)' : ''}{selectedSizes.includes(size.value) ? ' ✓' : ''}</option>))}
            </select>
            <p className="text-sm text-gray-500">Hold Ctrl/Cmd to select multiple sizes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sizeOptions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Standard Sizes</h4>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {sizeOptions.map((size, index) => {
                    const available = isSizeAvailable(size.value);
                    return (
                      <button key={index} type="button" onClick={() => toggleSize(size.value)} className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md relative ${available ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                        <span className="font-semibold text-lg">{size.label}</span>
                        <span className="text-xs mt-1">{available ? 'Available' : 'Not Available'}</span>
                        <div className="absolute top-2 right-2">{available ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-500" />}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {customSizes.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-gray-700">Custom Sizes</h4>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {customSizes.map((size, index) => {
                    const available = isSizeAvailable(size.value);
                    return (
                      <div key={index} className="relative group">
                        <button type="button" onClick={() => toggleSize(size.value)} className={`w-full p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md ${available ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                          <span className="font-semibold text-lg">{size.label}</span>
                          <span className="text-xs mt-1">Custom</span>
                          <div className="absolute top-2 right-2">{available ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-500" />}</div>
                        </button>
                        <button type="button" onClick={() => removeCustomSize(size.value)} className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Remove custom size"><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Tips:</p>
            <ul className="mt-1 space-y-1">
              <li>• Click size boxes to toggle availability</li>
              <li>• Use dropdown mode for products with many sizes</li>
              <li>• Custom sizes are specific to this product only</li>
              <li>• Selected sizes will be shown to customers as available options</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSizeSelector;
