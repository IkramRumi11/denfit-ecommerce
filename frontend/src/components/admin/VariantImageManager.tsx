import React, { useState } from 'react';
import { X, Upload, Plus, Eye, EyeOff } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';

interface VariantImageManagerProps {
  tempId: string;
  colorName: string;
  existingImages: Array<any>;
  localFiles: File[];
  onExistingImageRemove: (index: number) => void;
  onLocalImageRemove: (index: number) => void;
  onImagesAdded: (files: File[]) => void;
  onSwatchAdded: (file: File | null) => void;
  onExistingImageAdd?: (img: any) => void;
  onSwatchUrlAdd?: (url: string) => void;
  swatchFile?: File | null;
}

export const VariantImageManager: React.FC<VariantImageManagerProps> = ({
  tempId,
  colorName,
  existingImages,
  localFiles,
  onExistingImageRemove,
  onLocalImageRemove,
  onImagesAdded,
  onExistingImageAdd,
  onSwatchUrlAdd,
  onSwatchAdded,
  swatchFile,
}) => {
  const { showToast } = useToast();
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [showSwatchUrl, setShowSwatchUrl] = useState(false);
  const [swatchUrlInput, setSwatchUrlInput] = useState('');
  const [validatingSwatchUrl, setValidatingSwatchUrl] = useState(false);

  const handleUrlSubmit = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      showToast('Please enter a valid image URL', 'error');
      return;
    }

    setValidatingUrl(true);
    try {
      // Ask backend to fetch and store the image and return stored file metadata
      const res = await api.admin.uploadFromUrl(trimmedUrl);
      if (res?.data?.files && res.data.files[0]) {
        const stored = res.data.files[0];
        if (onExistingImageAdd) onExistingImageAdd(stored);
        setUrlInput('');
        setUploadMode('file');
        showToast('Image fetched and added to variant', 'success');
      } else {
        showToast('Failed to fetch image from URL', 'error');
      }
    } catch (err: any) {
      console.error('URL fetch error:', err);
      showToast(err?.message || 'Error fetching image from URL', 'error');
    } finally {
      setValidatingUrl(false);
    }
  };

  const handleSwatchUrlSubmit = async () => {
    const trimmedUrl = swatchUrlInput.trim();
    if (!trimmedUrl) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      showToast('Please enter a valid image URL', 'error');
      return;
    }

    setValidatingSwatchUrl(true);
    try {
      // Let backend fetch and store swatch, then pass stored URL back to parent
      const res = await api.admin.uploadFromUrl(trimmedUrl);
      if (res?.data?.files && res.data.files[0]) {
        const stored = res.data.files[0];
        if (onSwatchUrlAdd) onSwatchUrlAdd(stored.url);
        setSwatchUrlInput('');
        setShowSwatchUrl(false);
        showToast('Swatch fetched and saved', 'success');
      } else {
        showToast('Failed to fetch swatch from URL', 'error');
      }
    } catch (err: any) {
      console.error('Swatch URL fetch error:', err);
      showToast(err?.message || 'Error fetching swatch from URL', 'error');
    } finally {
      setValidatingSwatchUrl(false);
    }
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  const handleSwatchUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSwatchUrlSubmit();
    }
  };

  return (
    <div className="ml-2 space-y-3">
      {/* Swatch Section */}
      <div className="border rounded p-3 bg-gray-50">
        <label className="text-xs font-medium text-gray-700 block mb-2">Color Swatch (optional)</label>
        <div className="flex gap-2 items-center flex-wrap">
          {swatchFile && (
            <div className="w-16 h-16 rounded border overflow-hidden relative">
              {(swatchFile as any).isUrl ? (
                <img src={(swatchFile as any).urlData} alt="swatch" className="w-full h-full object-cover" />
              ) : (
                <img src={URL.createObjectURL(swatchFile)} alt="swatch" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => onSwatchAdded(null)}
                className="absolute top-0 right-0 bg-white text-red-600 rounded-bl px-1 text-sm"
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-2 mb-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSwatchAdded(file);
            }}
            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowSwatchUrl(!showSwatchUrl)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showSwatchUrl ? 'Use File Upload' : 'Or use URL'}
        </button>

        {showSwatchUrl && (
          <div className="flex gap-2 mt-2">
            <input
              type="url"
              value={swatchUrlInput}
              onChange={(e) => setSwatchUrlInput(e.target.value)}
              onKeyPress={handleSwatchUrlKeyPress}
              placeholder="https://example.com/swatch.jpg"
              disabled={validatingSwatchUrl}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSwatchUrlSubmit}
              disabled={validatingSwatchUrl}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Variant Images Section */}
      <div className="border rounded p-3 bg-gray-50">
        <label className="text-xs font-medium text-gray-700 block mb-2">Variant Images</label>
        
        <div className="flex gap-2 mb-2 flex-wrap">
          {/* Existing images from server */}
          {existingImages.map((img: any, imgIdx: number) => (
            <div key={`existing-${imgIdx}`} className="w-16 h-16 rounded overflow-hidden relative border group">
              <img src={img.url || img.path || img} alt={`variant-${imgIdx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onExistingImageRemove(imgIdx)}
                className="absolute top-0 right-0 bg-white text-red-600 rounded-bl px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}

          {/* Newly selected local files */}
          {localFiles.map((f: File, i: number) => (
            <div key={`local-${i}`} className="w-16 h-16 rounded overflow-hidden relative border group">
              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onLocalImageRemove(i)}
                className="absolute top-0 right-0 bg-white text-red-600 rounded-bl px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setUploadMode(uploadMode === 'file' ? 'url' : 'file')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-1"
          >
            {uploadMode === 'file' ? 'Add via URL' : 'Add via File'}
          </button>
        </div>

        {uploadMode === 'file' ? (
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) onImagesAdded(files);
            }}
            className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <div className="flex gap-2 mt-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={handleUrlKeyPress}
              placeholder="https://example.com/image.jpg"
              disabled={validatingUrl}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={validatingUrl}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantImageManager;
