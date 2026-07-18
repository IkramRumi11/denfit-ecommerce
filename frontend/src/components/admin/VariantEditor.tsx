import React from 'react';
import { Plus, X, Package } from 'lucide-react';
import { getColorName } from '../../utils/colorNames';
import { VariantImageManager } from './VariantImageManager';

interface VariantEditorProps {
  colors: any[];
  existingVariantImages: Record<string, any[]>;
  variantFiles: Record<string, { swatch?: File | null; images: File[] }>;
  onAddColor: () => void;
  onRemoveColor: (idx: number) => void;
  onUpdateColor: (idx: number, key: string, val: string) => void;
  onExistingImageRemove: (tid: string, imgIdx: number) => void;
  onExistingImageAdd: (tid: string, img: any) => void;
  onLocalImageRemove: (tid: string, imgIdx: number) => void;
  onImagesAdded: (tid: string, files: File[]) => void;
  onSwatchAdded: (tid: string, file: File | null) => void;
  onSwatchUrlAdd: (tid: string, url: string) => void;
}

export const VariantEditor: React.FC<VariantEditorProps> = ({
  colors,
  existingVariantImages,
  variantFiles,
  onAddColor,
  onRemoveColor,
  onUpdateColor,
  onExistingImageRemove,
  onExistingImageAdd,
  onLocalImageRemove,
  onImagesAdded,
  onSwatchAdded,
  onSwatchUrlAdd
}) => {
  const safeColors = Array.isArray(colors) ? colors : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Color Variants</h2>
        <button
          type="button"
          onClick={onAddColor}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Color
        </button>
      </div>

      <div className="space-y-4">
        {safeColors.map((color: any, idx: number) => {
          const tid = color.tempId;
          return (
            <div key={tid} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: color.hex || color.value || 'transparent' }}
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {color.name || getColorName(color.hex || color.value) || `Color ${idx + 1}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {color.value || color.hex}{' '}
                    {!color.name ? `• ${getColorName(color.hex || color.value)}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveColor(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor={`color-name-${tid}`} className="block text-xs text-gray-500 mb-1">
                    Color Name
                  </label>
                  <input
                    id={`color-name-${tid}`}
                    type="text"
                    value={color.name || ''}
                    onChange={(e) => onUpdateColor(idx, 'name', e.target.value)}
                    placeholder="e.g., Red, Blue, Green"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label htmlFor={`color-value-${tid}`} className="block text-xs text-gray-500 mb-1">
                    Color Value
                  </label>
                  <input
                    id={`color-value-${tid}`}
                    type="text"
                    value={color.value || color.hex || ''}
                    onChange={(e) => onUpdateColor(idx, 'value', e.target.value)}
                    placeholder="#ff0000 or 'red'"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              <VariantImageManager
                tempId={tid}
                colorName={color.name || color.value || tid}
                existingImages={existingVariantImages[tid] || []}
                localFiles={(variantFiles[tid] && variantFiles[tid].images) || []}
                onExistingImageRemove={(imgIdx) => onExistingImageRemove(tid, imgIdx)}
                onExistingImageAdd={(img) => onExistingImageAdd(tid, img)}
                onLocalImageRemove={(imgIdx) => onLocalImageRemove(tid, imgIdx)}
                onImagesAdded={(files) => onImagesAdded(tid, files as File[])}
                onSwatchAdded={(file) => onSwatchAdded(tid, file)}
                onSwatchUrlAdd={(url) => onSwatchUrlAdd(tid, url)}
                swatchFile={
                  variantFiles[tid]?.swatch ||
                  (color.swatchImage?.url
                    ? { isUrl: true, urlData: color.swatchImage.url }
                    : null)
                }
              />
            </div>
          );
        })}

        {safeColors.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No colors added yet</p>
            <p className="text-sm text-gray-500 mt-1">Add colors to enable per-color image uploads</p>
            <button
              type="button"
              onClick={onAddColor}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Color
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
