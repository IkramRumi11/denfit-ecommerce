import { getConsistentColor, slugify } from './productHelpers';

export interface AvailableColorItem {
  name: string;
  hex: string;
  slug: string;
}

/**
 * Extracts unique, normalized colors from a collection of products.
 * Merges equivalent color representations (e.g. 'black', 'Black', '#000000')
 * so that each distinct color appears once.
 */
export function extractAvailableColors(products: any[]): AvailableColorItem[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const map = new Map<string, { name: string; hex: string }>();

  for (const product of products) {
    if (!product) continue;

    const rawList: any[] = [];

    if (Array.isArray(product.variants)) {
      rawList.push(...product.variants);
    }
    if (Array.isArray(product.colors)) {
      rawList.push(...product.colors);
    }
    if (product.color) {
      rawList.push(product.color);
    }

    for (const item of rawList) {
      if (!item) continue;
      const { hex, name } = getConsistentColor(item);
      const trimmedName = (name || '').trim();

      // Skip invalid or uninformative color names
      if (!trimmedName || /^default$/i.test(trimmedName) || /^color$/i.test(trimmedName)) {
        continue;
      }

      // Canonical key based on resolved color name (e.g. "black")
      const canonicalKey = trimmedName.toLowerCase();
      if (!map.has(canonicalKey)) {
        map.set(canonicalKey, {
          name: trimmedName,
          hex: hex || '#000000',
        });
      }
    }
  }

  return Array.from(map.entries()).map(([slug, { name, hex }]) => ({
    slug,
    name,
    hex,
  }));
}

/**
 * Checks whether a product has any color matching the requested target color.
 * Supports multi-color products: returns true if any valid color or variant matches.
 */
export function productMatchesColor(product: any, selectedColor: string | null | undefined): boolean {
  if (!selectedColor || typeof selectedColor !== 'string') return true;
  const target = selectedColor.trim().toLowerCase();
  if (!target || target === 'all') return true;

  const targetSlug = slugify(target);

  const rawList: any[] = [];
  if (Array.isArray(product.variants)) {
    rawList.push(...product.variants);
  }
  if (Array.isArray(product.colors)) {
    rawList.push(...product.colors);
  }
  if (product.color) {
    rawList.push(product.color);
  }

  for (const item of rawList) {
    if (!item) continue;

    const { hex, name } = getConsistentColor(item);
    const itemHex = (hex || '').trim().toLowerCase();
    const itemName = (name || '').trim().toLowerCase();
    const itemSlug = slugify(name);

    if (itemName === target || itemHex === target || itemSlug === targetSlug) {
      return true;
    }

    // Direct match against raw fields if present
    if (typeof item === 'object') {
      const rawVal = String(item.value || item.hex || item.name || '').trim().toLowerCase();
      if (rawVal === target || slugify(rawVal) === targetSlug) {
        return true;
      }
    } else if (typeof item === 'string') {
      const rawStr = item.trim().toLowerCase();
      if (rawStr === target || slugify(rawStr) === targetSlug) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether a given hex color is perceived as light,
 * used to pick contrasting checkmark colors on swatches.
 */
export function isLightColorHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return false;
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const val = parseInt(full, 16);
  if (Number.isNaN(val)) return false;
  const r = (val >> 16) & 0xff;
  const g = (val >> 8) & 0xff;
  const b = val & 0xff;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
