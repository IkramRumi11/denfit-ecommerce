// src/utils/productHelpers.ts
import type { Product } from "../types";

export const productId = (p: Product | any): string => {
  return (p && (p.id || p._id)) ? String(p.id ?? p._id) : '';
};

export const primaryImage = (p: Product | any): string => {
  if (!p) return '';
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
