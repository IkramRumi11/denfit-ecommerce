import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{ 
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 1 }) => {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded loading-skeleton"
            style={{ width: `${100 - i * 10}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-gray-200 rounded loading-skeleton ${className}`} />
  );
};

// Product card skeleton
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded flex-1" />
          <div className="h-10 bg-gray-200 rounded w-10" />
        </div>
      </div>
    </div>
  );
};