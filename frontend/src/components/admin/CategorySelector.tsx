import React from 'react';

interface CategorySelectorProps {
  category: string;
  subcategory: string;
  availableSubcategories: string[];
  dynamicFilterGroups: any[];
  dynamicAttributes: Record<string, string[]>;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  onToggleAttribute: (groupSlug: string, optionValue: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  category,
  subcategory,
  availableSubcategories,
  dynamicFilterGroups,
  dynamicAttributes,
  onCategoryChange,
  onSubcategoryChange,
  onToggleAttribute
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="kids">Kids</option>
          <option value="sale">Sale</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>

      <div>
        <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
          Subcategory <span className="text-gray-400 text-xs font-normal">(from filter configs)</span>
        </label>
        <select
          id="subcategory"
          name="subcategory"
          value={subcategory}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={availableSubcategories.length === 0}
        >
          <option value="">Select a subcategory</option>
          {availableSubcategories.map((sc) => (
            <option key={sc} value={sc}>
              {sc.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        {availableSubcategories.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">
            No filter configs found for this category. Create them in Filter Management.
          </p>
        )}
      </div>

      {/* ─── Dynamic Attributes (from FilterEngine configs) ─── */}
      {dynamicFilterGroups.length > 0 && (
        <div className="mt-2 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Product Attributes
            <span className="text-gray-400 font-normal text-xs ml-2">
              ({dynamicFilterGroups.length} filter groups for "{subcategory}")
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dynamicFilterGroups.map((group: any) => (
              <div key={group._id || group.slug} className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                  {group.name}
                </label>
                {(group.options || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(group.options || []).map((opt: any) => {
                      const isSelected = (dynamicAttributes[group.slug] || []).includes(opt.value);
                      return (
                        <button
                          key={opt._id || opt.slug}
                          type="button"
                          onClick={() => onToggleAttribute(group.slug, opt.value)}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {opt.meta?.hex && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 mr-1.5 align-middle"
                              style={{ backgroundColor: opt.meta.hex }}
                            />
                          )}
                          {opt.label || opt.value}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-normal">No options defined</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
