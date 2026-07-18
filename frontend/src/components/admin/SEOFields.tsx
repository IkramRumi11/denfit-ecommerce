import React from 'react';

interface SEOFieldsProps {
  title: string;
  description: string;
  slug: string;
  onChange: (field: string, value: string) => void;
}

export const SEOFields: React.FC<SEOFieldsProps> = ({
  title,
  description,
  slug,
  onChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">SEO Settings</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-2">
            SEO Title
          </label>
          <input
            id="seoTitle"
            type="text"
            value={title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-2">
            SEO Description
          </label>
          <textarea
            id="seoDescription"
            value={description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="seoSlug" className="block text-sm font-medium text-gray-700 mb-2">
            Slug
          </label>
          <input
            id="seoSlug"
            type="text"
            value={slug || ''}
            onChange={(e) => onChange('slug', e.target.value)}
            placeholder="auto-generated from name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
