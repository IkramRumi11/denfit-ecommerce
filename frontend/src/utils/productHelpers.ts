// src/utils/productHelpers.ts
import type { Product } from "../types";

export const productId = (p: Product | any): string => {
  if (!p) return '';
  // Prefer SEO slug when available, then id/_id
  if (p.slug) return String(p.slug);
  if (p.id || p._id) return String(p.id ?? p._id);
  return '';
};

export const primaryImage = (p: Product | any): string => {
  if (!p) return '';
  // If a selectedVariantId is present, try to use the variant's first image
  const selectedVariantId = p.selectedVariantId || (p.selectedVariant && (p.selectedVariant._id || p.selectedVariant.id));
  if (Array.isArray(p.variants) && p.variants.length) {
    let variant = null;
    if (selectedVariantId) variant = p.variants.find((v: any) => String(v._id || v.id) === String(selectedVariantId));
    if (!variant) variant = p.variants[0];
    if (variant && Array.isArray(variant.images) && variant.images.length) {
      const first = variant.images[0];
      return typeof first === 'string' ? first : (first && first.url) ? first.url : '';
    }
  }

  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (!first) return '';
    if (typeof first === 'string') return first;
    return (first as any).url || '';
  }
  if (p.image) return p.image as string;
  return 'https://via.placeholder.com/300';
};

export const priceNumber = (p: Product | any): number => {
  if (!p) return 0;
  const v = p.price ?? 0;
  if (typeof v === 'number') return v;
  const parsed = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export default {
  productId,
  primaryImage,
  priceNumber,
};

export const slugify = (input: string | undefined | null): string => {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
};
