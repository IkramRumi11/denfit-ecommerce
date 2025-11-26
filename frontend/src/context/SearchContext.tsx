import React, { createContext, useContext, useState, useCallback } from 'react';

type SearchContextType = {
  query: string;
  filters: SearchFilters;
  setQuery: (q: string) => void;
  setFilters: (f: SearchFilters) => void;
  clearSearch: () => void;
};

type SearchFilters = {
  category?: string | undefined;
  priceRange?: [number, number] | undefined;
  sizes?: string[] | undefined;
  colors?: string[] | undefined;
  inStock?: boolean | undefined;
  featured?: boolean | undefined;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    category: undefined,
    priceRange: undefined,
    sizes: undefined,
    colors: undefined,
    inStock: undefined,
    featured: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery.trim());
  }, []);

  const handleSetFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({
      category: undefined,
      priceRange: undefined,
      sizes: undefined,
      colors: undefined,
      inStock: undefined,
      featured: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, []);

  const value: SearchContextType = {
    query,
    filters,
    setQuery: handleSetQuery,
    setFilters: handleSetFilters,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};