export function getAvailableStockForItem(
  prod: any,
  item: {
    size?: string | null;
    color?: string | null;
    colorName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    variantHex?: string | null;
  }
): number {
  if (!prod) return 0;

  const targetSize = item.size ? String(item.size).trim().toLowerCase() : '';
  const targetColor = item.color ? String(item.color).trim().toLowerCase() : '';
  const targetColorName = item.colorName ? String(item.colorName).trim().toLowerCase() : '';
  const targetVariantId = item.variantId ? String(item.variantId).trim() : '';
  const targetVariantName = item.variantName ? String(item.variantName).trim().toLowerCase() : '';
  const targetVariantHex = item.variantHex ? String(item.variantHex).trim().toLowerCase() : '';

  // Helper to match a stock item's colorTempId
  const matchColor = (sColorTempId: any): boolean => {
    if (!sColorTempId) return !targetColor && !targetVariantId && !targetColorName;
    const sId = String(sColorTempId).trim();
    const sIdLower = sId.toLowerCase();

    if (targetVariantId && sId === targetVariantId) return true;
    if (targetColor && (sIdLower === targetColor || sIdLower.replace(/^#/, '') === targetColor.replace(/^#/, ''))) return true;
    if (targetColorName && sIdLower === targetColorName) return true;
    if (targetVariantName && sIdLower === targetVariantName) return true;
    if (targetVariantHex && (sIdLower === targetVariantHex || sIdLower.replace(/^#/, '') === targetVariantHex.replace(/^#/, ''))) return true;

    // Check against variants list if available
    if (Array.isArray(prod.variants) && prod.variants.length) {
      const v = prod.variants.find((varItem: any) => {
        if (!varItem) return false;
        const vId = String(varItem._id || varItem.id || varItem.tempId || '');
        const vName = String(varItem.name || '').toLowerCase().trim();
        const vHex = String(varItem.hex || '').toLowerCase().trim();
        const matchesTarget = (targetVariantId && vId === targetVariantId) ||
          (targetColorName && vName === targetColorName) ||
          (targetColor && (vHex === targetColor || vName === targetColor)) ||
          (targetVariantName && vName === targetVariantName);
        return matchesTarget;
      });

      if (v) {
        const vId = String(v._id || v.id || v.tempId || '');
        const vName = String(v.name || '').toLowerCase().trim();
        const vHex = String(v.hex || '').toLowerCase().trim();
        if (sId === vId || sIdLower === vName || sIdLower === vHex) return true;
      }
    }

    // Check against colors list if available
    if (Array.isArray(prod.colors) && prod.colors.length) {
      const c = prod.colors.find((colItem: any) => {
        if (!colItem) return false;
        const cName = String(colItem.name || '').toLowerCase().trim();
        const cHex = String(colItem.hex || colItem.value || '').toLowerCase().trim();
        return (targetColorName && cName === targetColorName) ||
          (targetColor && (cHex === targetColor || cName === targetColor));
      });
      if (c) {
        const cName = String(c.name || '').toLowerCase().trim();
        const cHex = String(c.hex || c.value || '').toLowerCase().trim();
        if (sIdLower === cName || sIdLower === cHex) return true;
      }
    }

    // If item has no color specified at all
    if (!targetColor && !targetColorName && !targetVariantId && !targetVariantName) return true;

    return false;
  };

  // Helper to match a stock item's sizeId
  const matchSize = (sSizeId: any): boolean => {
    if (!sSizeId) return !targetSize;
    const sId = String(sSizeId).trim();
    const sIdLower = sId.toLowerCase();

    if (targetSize && sIdLower === targetSize) return true;

    // Check against sizes / sizesObjects
    const sizesArr = Array.isArray(prod.sizesObjects) && prod.sizesObjects.length
      ? prod.sizesObjects
      : (Array.isArray(prod.sizes) ? prod.sizes : []);

    for (let idx = 0; idx < sizesArr.length; idx++) {
      const sz = sizesArr[idx];
      const szId = sz && typeof sz === 'object' ? String(sz.id || sz._id || `size_${idx}`) : `size_${idx}`;
      const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '') : String(sz);
      const szValLower = szVal.toLowerCase().trim();

      if (sId === szId || sIdLower === szValLower || sIdLower === `size_legacy_${idx}`) {
        if (!targetSize || szValLower === targetSize) return true;
      }
    }

    if (!targetSize) return true;
    return false;
  };

  // 1. Check exact match in stock array
  if (Array.isArray(prod.stock) && prod.stock.length > 0) {
    const exactMatch = prod.stock.find((st: any) => st && matchColor(st.colorTempId) && matchSize(st.sizeId));
    if (exactMatch && typeof exactMatch.quantity === 'number') {
      return exactMatch.quantity;
    }

    // If only color was provided, sum for that color
    const colorMatches = prod.stock.filter((st: any) => st && matchColor(st.colorTempId));
    if (colorMatches.length > 0) {
      if (!targetSize) {
        return colorMatches.reduce((acc: number, st: any) => acc + (Number(st.quantity) || 0), 0);
      }
      // If color matched but size wasn't exact in matrix, check if matching size quantity exists
      const sizeMatch = colorMatches.find((st: any) => st && matchSize(st.sizeId));
      if (sizeMatch && typeof sizeMatch.quantity === 'number') return sizeMatch.quantity;
    }
  }

  // 2. Check variants inventory
  if (Array.isArray(prod.variants) && prod.variants.length > 0) {
    const v = prod.variants.find((varItem: any) => {
      if (!varItem) return false;
      const vId = String(varItem._id || varItem.id || varItem.tempId || '');
      const vName = String(varItem.name || '').toLowerCase().trim();
      const vHex = String(varItem.hex || '').toLowerCase().trim();
      return (targetVariantId && vId === targetVariantId) ||
        (targetColorName && vName === targetColorName) ||
        (targetColor && (vHex === targetColor || vName === targetColor)) ||
        (targetVariantName && vName === targetVariantName);
    });
    if (v && typeof v.inventory === 'number' && !Number.isNaN(v.inventory)) return v.inventory;
  }

  // 3. Check sizes quantities
  const sizesArr = Array.isArray(prod.sizesObjects) && prod.sizesObjects.length
    ? prod.sizesObjects
    : (Array.isArray(prod.sizes) ? prod.sizes : []);
  if (sizesArr.length > 0 && targetSize) {
    const sz = sizesArr.find((s: any) => {
      const val = s && typeof s === 'object' ? String(s.value || s.label || s.name || '').toLowerCase().trim() : String(s).toLowerCase().trim();
      const id = s && typeof s === 'object' ? String(s.id || s._id || '').toLowerCase().trim() : '';
      return val === targetSize || id === targetSize;
    });
    if (sz && typeof sz === 'object' && typeof sz.quantity === 'number' && !Number.isNaN(sz.quantity)) return sz.quantity;
  }

  // 4. Fallback to top-level inventory or availableQuantity
  if (typeof prod.availableQuantity === 'number' && !Number.isNaN(prod.availableQuantity)) return prod.availableQuantity;
  if (typeof prod.inventory === 'number' && !Number.isNaN(prod.inventory)) return prod.inventory;
  if (typeof prod.inventory === 'string' && prod.inventory !== '' && !Number.isNaN(Number(prod.inventory))) return Number(prod.inventory);

  return 0;
}

export function getAvailableQuantity(product: any, selectedSize?: string, selectedColor?: string): number {
  return getAvailableStockForItem(product, { size: selectedSize, color: selectedColor });
}

export function isOutOfStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  return getAvailableQuantity(product, selectedSize, selectedColor) <= 0;
}

export function isLowStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  if (!product) return false;
  if (typeof product.isLowStock === 'boolean') return product.isLowStock;
  const viteRaw = (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_LOW_STOCK_THRESHOLD);
  const nodeRaw = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITE_LOW_STOCK_THRESHOLD) ? (process as any).env.VITE_LOW_STOCK_THRESHOLD : undefined;
  const raw = viteRaw || nodeRaw;
  const threshold = raw ? Number(raw) : 20;
  if (Number.isNaN(threshold)) return false;
  const qty = getAvailableQuantity(product, selectedSize, selectedColor);
  return qty > 0 && qty <= threshold;
}

export default { getAvailableStockForItem, getAvailableQuantity, isOutOfStock, isLowStock };
