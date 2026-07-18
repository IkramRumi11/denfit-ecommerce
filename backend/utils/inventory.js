// backend/utils/inventory.js
// Helpers to compute canonical inventory/stock values for products.
export function _normalizeString(v) {
  if (v === undefined || v === null) return '';
  return String(v).toLowerCase().trim();
}

export function computeAvailableQuantity(prod = {}) {
  try {
    // Prefer explicit stock mapping when present
    if (Array.isArray(prod.stock) && prod.stock.length) {
      const total = prod.stock.reduce((acc, s) => acc + (Number((s && s.quantity) || 0)), 0);
      // If any mapping exists return its sum (even if zero)
      return Number(total || 0);
    }

    // Next prefer explicit size-level quantities when they contain numeric values
    if (Array.isArray(prod.sizes) && prod.sizes.length) {
      const anyNumeric = prod.sizes.some(s => s && (s.quantity !== null && s.quantity !== undefined) && !Number.isNaN(Number(s.quantity)));
      if (anyNumeric) {
        return prod.sizes.reduce((acc, s) => acc + (Number((s && s.quantity) || 0)), 0);
      }
    }

    // Next prefer summing variant inventories when present
    if (Array.isArray(prod.variants) && prod.variants.length) {
      const anyVariantNumeric = prod.variants.some(v => v && (v.inventory !== null && v.inventory !== undefined) && !Number.isNaN(Number(v.inventory)));
      if (anyVariantNumeric) {
        return prod.variants.reduce((acc, v) => acc + (Number((v && v.inventory) || 0)), 0);
      }
    }

    // Fall back to top-level inventory when available
    if (typeof prod.inventory === 'number' && !Number.isNaN(prod.inventory)) return prod.inventory;

    // Last resort: return 0
    return 0;
  } catch (e) {
    return 0;
  }
}

export function computeIsLowStock(prod = {}, threshold = null) {
  if (!prod) return false;
  const qty = typeof prod.availableQuantity === 'number' ? prod.availableQuantity : computeAvailableQuantity(prod);
  if (threshold == null) return false;
  const t = Number(threshold);
  if (Number.isNaN(t)) return false;
  return qty > 0 && qty <= t;
}

export function computeIsOutOfStock(prod = {}) {
  const qty = typeof prod.availableQuantity === 'number' ? prod.availableQuantity : computeAvailableQuantity(prod);
  return qty <= 0;
}

export default { computeAvailableQuantity, computeIsLowStock, computeIsOutOfStock };
