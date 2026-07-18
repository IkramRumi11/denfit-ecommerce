import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  label?: string;
  allowRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

type UploadMode = 'file' | 'url';

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  currentImage,
  label = 'Upload Image',
  allowRemove = true,
  onRemove,
  className = '',
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<UploadMode>('file');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    setUploading(true);
    try {
      const res = await api.admin.uploadFiles(files);
      if (res?.data?.files && res.data.files[0]) {
        const imageUrl = res.data.files[0].url;
        onImageSelect(imageUrl);
        showToast('Image uploaded successfully', 'success');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err?.message || 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Validate and add URL
  const handleUrlSubmit = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      showToast('Please enter a valid image URL', 'error');
      return;
    }

    setValidatingUrl(true);
    try {
      // Ask backend to fetch and store the image so we have a canonical hosted URL
      const res = await api.admin.uploadFromUrl(trimmedUrl);
      if (res?.data?.files && res.data.files[0]) {
        const storedUrl = res.data.files[0].url;
        onImageSelect(storedUrl);
        setUrlInput('');
        setMode('file');
        showToast('Image fetched and stored successfully', 'success');
      } else {
        showToast('Failed to store image from URL', 'error');
      }
    } catch (err: any) {
      console.error('URL fetch error:', err);
      showToast(err?.message || 'Error fetching image from URL', 'error');
    } finally {
      setValidatingUrl(false);
    }
  };

  // Handle URL input key press
  const handleUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            mode === 'file'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            mode === 'url'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 inline mr-2" />
          From URL
        </button>
      </div>

      {/* File Upload Mode */}
      {mode === 'file' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <>
                  <div className="animate-spin">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {/* URL Input Mode */}
      {mode === 'url' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={handleUrlKeyPress}
              placeholder="https://example.com/image.jpg"
              disabled={validatingUrl}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={validatingUrl || !urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {validatingUrl ? (
                <div className="animate-spin">
                  <Upload className="w-4 h-4" />
                </div>
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Paste the full URL of an online image. Image must be accessible publicly.
          </p>
        </div>
      )}

      {/* Current Image Preview */}
      {currentImage && (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Image</p>
              <div className="relative group">
                <img
                  src={currentImage}
                  alt="Current"
                  className="w-full h-32 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="absolute top-2 right-2 bg-white/80 p-1 rounded hover:bg-white transition-colors"
                  title={showPreview ? 'Hide URL' : 'Show URL'}
                >
                  {showPreview ? (
                    <EyeOff className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
              {showPreview && (
                <div className="mt-2 p-2 bg-white rounded border border-gray-200 break-all">
                  <p className="text-xs text-gray-600 font-mono">{currentImage}</p>
                </div>
              )}
            </div>
            {allowRemove && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove image"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
