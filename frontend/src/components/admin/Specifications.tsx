import React from 'react';

interface SpecificationsProps {
  material: string;
  care: string;
  fit: string;
  origin: string;
  onChange: (field: string, value: string) => void;
}

export const Specifications: React.FC<SpecificationsProps> = ({
  material,
  care,
  fit,
  origin,
  onChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="spec-material" className="block text-sm font-medium text-gray-700 mb-2">
            Material
          </label>
          <input
            id="spec-material"
            type="text"
            value={material || ''}
            onChange={(e) => onChange('material', e.target.value)}
            placeholder="e.g., Cotton, Polyester"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="spec-care" className="block text-sm font-medium text-gray-700 mb-2">
            Care Instructions
          </label>
          <input
            id="spec-care"
            type="text"
            value={care || ''}
            onChange={(e) => onChange('care', e.target.value)}
            placeholder="e.g., Machine Wash"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="spec-fit" className="block text-sm font-medium text-gray-700 mb-2">
            Fit
          </label>
          <input
            id="spec-fit"
            type="text"
            value={fit || ''}
            onChange={(e) => onChange('fit', e.target.value)}
            placeholder="e.g., Regular, Slim"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="spec-origin" className="block text-sm font-medium text-gray-700 mb-2">
            Origin
          </label>
          <input
            id="spec-origin"
            type="text"
            value={origin || ''}
            onChange={(e) => onChange('origin', e.target.value)}
            placeholder="e.g., Pakistan"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
