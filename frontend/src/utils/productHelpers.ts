// src/utils/productHelpers.ts
import type { Product } from "../types";
import { getColorName, resolveColorHex } from "./colorNames";

export function getConsistentColor(c: any): { hex: string; name: string } {
  if (!c) return { hex: '#000000', name: 'Color' };
  if (typeof c === 'string') {
    const raw = c.trim();
    if (raw.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(raw)) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      return { hex, name: getColorName(hex) || hex };
    }
    const hex = resolveColorHex(raw) || '#000000';
    return { hex, name: getColorName(raw) || raw };
  }

  const rawHex = c?.hex || c?.normalizedHex || (typeof c?.value === 'string' && c.value.startsWith('#') ? c.value : undefined);
  const rawName = c?.name && !c.name.startsWith('#') ? c.name : (c?.displayName || '');

  // 1. If rawName is already a valid human-friendly color name, preserve it as the single source of truth
  if (rawName) {
    const hex = (rawHex && (rawHex.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(rawHex) || /^[0-9a-fA-F]{3}$/.test(rawHex)))
      ? (rawHex.startsWith('#') ? rawHex : `#${rawHex}`)
      : (resolveColorHex(rawName) || resolveColorHex(c?.value) || '#000000');
    return { hex, name: rawName };
  }

  // 2. If only hex is provided, resolve name from hex
  if (rawHex && (rawHex.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(rawHex) || /^[0-9a-fA-F]{3}$/.test(rawHex))) {
    const hex = rawHex.startsWith('#') ? rawHex : `#${rawHex}`;
    const name = getColorName(hex) || 'Color';
    return { hex, name };
  }

  const val = String(c?.value || '');
  const hex = resolveColorHex(val) || (val.startsWith('#') ? val : '#000000');
  const name = getColorName(val) || 'Color';
  return { hex, name };
}

export const canonicalProductId = (p: Product | any): string => {
  if (!p) return '';
  if (typeof p === 'string') return p.trim();
  if (p._id) return String(p._id);
  if (p.id && typeof p.id === 'string' && p.id.length === 24 && !p.id.includes('-')) return String(p.id);
  if (p.id) return String(p.id);
  if (p.slug) return String(p.slug);
  if (p.seo?.slug) return String(p.seo.slug);
  return '';
};

export const canonicalProductSlug = (p: Product | any): string => {
  if (!p) return '';
  if (p.slug) return String(p.slug);
  if (p.seo?.slug) return String(p.seo.slug);
  if (p.id) return String(p.id);
  if (p._id) return String(p._id);
  return '';
};

export const resolveProductSelection = (
  product: any,
  requested?: {
    size?: string;
    color?: string;
    colorName?: string;
    variantId?: string;
  }
) => {
  const reqSize = requested?.size || (Array.isArray(product?.sizes) && product.sizes[0]) || 'One Size';

  if (!product) {
    return {
      size: reqSize,
      color: requested?.color || undefined,
      colorName: requested?.colorName || undefined,
      variantId: requested?.variantId || undefined,
      variantHex: undefined,
      variantName: undefined,
      variantImage: undefined,
    };
  }

  // 1. Check variants
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    let variant = product.variants.find((v: any) => {
      if (requested?.variantId && String(v._id || v.id).toLowerCase() === String(requested.variantId).toLowerCase()) return true;
      if (requested?.color) {
        const k = String(requested.color).trim().toLowerCase();
        if (String(v._id || v.id).toLowerCase() === k) return true;
        if (String(v.hex || v.normalizedHex || v.value || '').toLowerCase() === k) return true;
        if (String(v.name || '').toLowerCase() === k) return true;
      }
      if (requested?.colorName && String(v.name || '').toLowerCase() === String(requested.colorName).toLowerCase()) return true;
      return false;
    });

    if (!variant && product.variants.length === 1) {
      variant = product.variants[0];
    }

    if (variant) {
      const vId = String(variant._id || variant.id || '');
      const vName = variant.name || getColorName(variant.hex || vId);
      const vHex = variant.hex || variant.normalizedHex || variant.value || resolveColorHex(vName) || undefined;
      const vImage = Array.isArray(variant.images) && variant.images[0] 
        ? (typeof variant.images[0] === 'string' ? variant.images[0] : variant.images[0].url) 
        : undefined;

      return {
        size: reqSize,
        color: vHex || vName,
        colorName: vName,
        variantId: vId,
        variantName: vName,
        variantHex: vHex,
        variantImage: vImage,
      };
    }
  }

  // 2. Check colors
  if (Array.isArray(product.colors) && product.colors.length > 0) {
    let col = product.colors.find((c: any) => {
      const k = String(requested?.color || requested?.colorName || '').trim().toLowerCase();
      if (!k) return false;
      if (String(c._id || c.id || '').toLowerCase() === k) return true;
      if (String(c.hex || c.normalizedHex || c.value || '').toLowerCase() === k) return true;
      if (String(c.name || c.displayName || '').toLowerCase() === k) return true;
      return false;
    });

    if (!col && product.colors.length === 1) {
      col = product.colors[0];
    }

    if (col) {
      const colName = col.name || col.displayName || getColorName(col.hex || '');
      const colHex = col.hex || col.normalizedHex || col.value || resolveColorHex(colName) || undefined;
      return {
        size: reqSize,
        color: colHex || colName,
        colorName: colName,
        variantId: requested?.variantId || undefined,
        variantName: colName,
        variantHex: colHex,
        variantImage: undefined,
      };
    }
  }

  // 3. Fallback from requested color
  const reqColor = requested?.color || requested?.colorName;
  const colName = requested?.colorName || (reqColor ? (reqColor.startsWith('#') ? getColorName(reqColor) : reqColor) : undefined);
  const colHex = requested?.color?.startsWith('#') ? requested.color : (colName ? resolveColorHex(colName) : undefined);

  return {
    size: reqSize,
    color: colHex || reqColor || undefined,
    colorName: colName,
    variantId: requested?.variantId || undefined,
    variantName: colName,
    variantHex: colHex,
    variantImage: undefined,
  };
};

export const productId = (p: Product | any): string => {
  return canonicalProductId(p);
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
  canonicalProductId,
  canonicalProductSlug,
  resolveProductSelection,
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

