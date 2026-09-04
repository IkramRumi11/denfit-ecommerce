import { getAvailableStockForItem } from './stockHelpers';

// Centralized category-based size rules
export type SizeGroup = 'clothing' | 'footwear' | 'accessories';

export function getCategoryGroup(category?: string, subcategory?: string): SizeGroup {
  const cat = (category || '').toString().toLowerCase();
  const sub = (subcategory || '').toString().toLowerCase();
  if (cat.includes('shoe') || sub.includes('shoe') || sub.includes('footwear') || cat.includes('footwear')) return 'footwear';
  if (sub.includes('watch') || sub.includes('belt') || sub.includes('accessory') || cat.includes('accessory')) return 'accessories';
  return 'clothing';
}

export function getStandardSizes(group: SizeGroup, gender?: string): string[] {
  if (group === 'clothing') {
    // World-class simplified: S, M, L, XL
    return ['S', 'M', 'L', 'XL'];
  }

  if (group === 'footwear') {
    const g = (gender || '').toLowerCase();
    if (g === 'women') return ['36','37','38','39','40','41'];
    if (g === 'kids') return ['28','29','30','31','32','33','34','35'];
    // default men
    return ['39','40','41','42','43','44','45'];
  }

  // accessories
  return ['ONE_SIZE','S','M','L'];
}

export function getAllSizesForProduct(product: any): string[] {
  const group = getCategoryGroup(product?.category, product?.subcategory || product?.category);
  const standard = getStandardSizes(group, product?.gender || product?.category);
  // product.sizes may contain custom sizes; prefer them if present and non-empty
  if (Array.isArray(product?.sizes) && product.sizes.length) return normalizeSizesArray(product.sizes);
  return normalizeSizesArray(standard);
}

// Returns the set of sizes that should be displayed for selection (product-level)
export function getDisplaySizesForProduct(product: any): string[] {
  return getAllSizesForProduct(product);
}

// Determine available sizes taking variant-level overrides into account.
// If a variant object is provided and it has `availableSizes`, prefer that.
export function getAvailableSizesForProduct(product: any, variant?: any): string[] {
  // If variant explicitly provides non-empty availableSizes, prefer that
  if (variant && Array.isArray(variant.availableSizes) && variant.availableSizes.length > 0) {
    return normalizeSizesArray(variant.availableSizes);
  }

  // Base set from product-level availableSizes or display sizes
  const base = Array.isArray(product?.availableSizes) && product.availableSizes.length > 0
    ? normalizeSizesArray(product.availableSizes)
    : getDisplaySizesForProduct(product);

  if (!product) return base;

  // If product has stock/variants/sizes data, filter base sizes by available stock for this variant/color
  try {
    const hasGranularStock = (Array.isArray(product.stock) && product.stock.length > 0) ||
      (Array.isArray(product.variants) && product.variants.some((v: any) => typeof v?.inventory === 'number')) ||
      (Array.isArray(product.sizesObjects) && product.sizesObjects.length > 0);

    if (hasGranularStock) {
      const vId = variant ? (variant._id || variant.id || variant.tempId || variant.variantId) : undefined;
      const vColor = variant ? (variant.hex || variant.normalizedHex || variant.color || variant.value || variant.name) : undefined;
      const vName = variant ? variant.name : undefined;

      const filtered = base.filter((s: string) => {
        return getAvailableStockForItem(product, {
          size: s,
          color: vColor,
          colorName: vName,
          variantId: vId
        }) > 0;
      });

      if (filtered.length > 0) return filtered;
    }
  } catch (e) {
    // fallback
  }

  return base;
}

// Ensure any size-like entries are converted to stable string primitives
function normalizeSizesArray(arr: any[]): string[] {
  // Accept both arrays and array-like objects (numeric keys)
  let list: any[] = [];
  if (!Array.isArray(arr) && arr && typeof arr === 'object') {
    const keys = Object.keys(arr).filter(k => /^\d+$/.test(k)).sort((a,b) => Number(a)-Number(b));
    if (keys.length) {
      list = keys.map(k => (arr as any)[k]);
    } else {
      // Not array-like: treat the object itself as a single entry
      list = [arr];
    }
  } else {
    list = arr.slice();
  }

  return list.map((s) => {
    if (s == null) return '';
    if (typeof s === 'string' || typeof s === 'number') return String(s);
    if (typeof s === 'object') {
      // If it's array-like nested, try convert recursively
      if (!Array.isArray(s) && Object.keys(s).some(k => /^\d+$/.test(k))) {
        const nested = Object.keys(s).filter(k => /^\d+$/.test(k)).sort((a,b) => Number(a)-Number(b)).map(k => (s as any)[k]);
        return normalizeSizesArray(nested).join(',');
      }
      // Common keys: value, size, label, name
      if ((s as any).value != null) return String((s as any).value);
      if ((s as any).size != null) return String((s as any).size);
      if ((s as any).label != null) return String((s as any).label);
      if ((s as any).name != null) return String((s as any).name);
      // Fall back to a deterministic serialization of primitive-like entries
      try {
        const keys = Object.keys(s).sort();
        return keys.map(k => `${k}:${String((s as any)[k])}`).join('|');
      } catch {
        return String(s);
      }
    }
    return String(s);
  }).filter(Boolean);
}
