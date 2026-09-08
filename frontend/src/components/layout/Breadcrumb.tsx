// src/components/layout/Breadcrumb.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Product } from '../../types';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Converts slug or lowercase strings into clean Title Case labels.
 * e.g., 't-shirts' -> 'T-Shirts', 'wallets' -> 'Wallets'
 */
export function slugToTitle(slug: string): string {
  if (!slug) return '';
  return slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'and' || lower === 'of' || lower === 'in') return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Builds structured breadcrumb navigation items for any given Product.
 * Resolves logical hierarchy: Home > Gender/Main Category > Subcategory/Brand > Product Name
 */
export function getProductBreadcrumbs(product: Product | null | undefined, customSubcategory?: string): BreadcrumbItem[] {
  if (!product) {
    return [
      { label: 'Home', to: '/' },
      { label: 'Product' }
    ];
  }

  const items: BreadcrumbItem[] = [
    { label: 'Home', to: '/' }
  ];

  const categoryLower = String(product.category || '').trim().toLowerCase();
  const genderLower = String(product.gender || '').trim().toLowerCase();
  const isFragrance = categoryLower === 'fragrances' ||
    (Array.isArray(product.sizes) && product.sizes.some((s: any) => String(s?.value || s).toLowerCase().includes('ml')));

  if (isFragrance) {
    items.push({ label: 'Fragrances', to: '/fragrances' });
    if (product.brand && product.brand.toLowerCase() !== 'denfit') {
      items.push({ label: product.brand, to: `/brands` });
    }
  } else if (genderLower === 'men' || genderLower === 'women' || genderLower === 'kids') {
    const genderLabel = genderLower.charAt(0).toUpperCase() + genderLower.slice(1);
    items.push({ label: genderLabel, to: `/${genderLower}` });

    const subcat = customSubcategory || product.category || (product as any).subcategory || (product as any).type;
    if (subcat && subcat.toLowerCase() !== genderLower && subcat.toLowerCase() !== 'all') {
      const subcatSlug = subcat.toLowerCase().replace(/\s+/g, '-');
      items.push({
        label: slugToTitle(subcat),
        to: `/${genderLower}/${subcatSlug}`
      });
    }
  } else if (categoryLower === 'accessories') {
    items.push({ label: 'Accessories', to: '/accessories' });
    const subcat = customSubcategory || (product as any).subcategory || (product as any).type;
    if (subcat && subcat.toLowerCase() !== 'accessories' && subcat.toLowerCase() !== 'all') {
      const subcatSlug = subcat.toLowerCase().replace(/\s+/g, '-');
      items.push({
        label: slugToTitle(subcat),
        to: `/accessories/${subcatSlug}`
      });
    }
  } else if (product.brand && product.brand.toLowerCase() !== 'denfit') {
    items.push({ label: 'Brands', to: '/brands' });
    items.push({ label: product.brand, to: `/brands` });
  } else {
    items.push({ label: 'Shop', to: '/shop' });
    if (product.category && product.category.toLowerCase() !== 'all') {
      items.push({
        label: slugToTitle(product.category),
        to: `/shop?category=${encodeURIComponent(product.category)}`
      });
    }
  }

  // Active / current product name (non-clickable last segment)
  items.push({
    label: product.name || 'Product Details'
  });

  return items;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-neutral-500 font-light tracking-wide">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !isLast && Boolean(item.to);

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
              )}
              {isClickable ? (
                <Link
                  to={item.to!}
                  className="hover:text-black transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[160px] sm:max-w-[260px] md:max-w-[380px] ${
                    isLast ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
