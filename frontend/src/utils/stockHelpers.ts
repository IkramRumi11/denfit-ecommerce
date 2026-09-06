export function getAvailableStockForItem(
  prod: any,
  item?: {
    size?: string | null;
    color?: string | null;
    colorName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    variantHex?: string | null;
  }
): number {
  if (!prod) return 0;
  if (!item) item = {};

  const targetSize = item.size ? String(item.size).trim().toLowerCase() : '';
  const targetColor = item.color ? String(item.color).trim().toLowerCase() : '';
  const targetColorName = item.colorName ? String(item.colorName).trim().toLowerCase() : '';
  const targetVariantId = item.variantId ? String(item.variantId).trim() : '';
  const targetVariantName = item.variantName ? String(item.variantName).trim().toLowerCase() : '';
  const targetVariantHex = item.variantHex ? String(item.variantHex).trim().toLowerCase() : '';

  // Collect all known color tokens for the target selection
  const targetColorTokens = new Set<string>();
  if (targetVariantId) targetColorTokens.add(targetVariantId.toLowerCase());
  if (targetColor) {
    targetColorTokens.add(targetColor);
    targetColorTokens.add(targetColor.replace(/^#/, ''));
  }
  if (targetColorName) targetColorTokens.add(targetColorName);
  if (targetVariantName) targetColorTokens.add(targetVariantName);
  if (targetVariantHex) {
    targetColorTokens.add(targetVariantHex);
    targetColorTokens.add(targetVariantHex.replace(/^#/, ''));
  }

  // Enrich targetColorTokens from prod.colors
  if (Array.isArray(prod.colors) && prod.colors.length) {
    const matchedColors = prod.colors.filter((c: any) => {
      if (!c) return false;
      const cid = String(c._id || c.id || c.tempId || '').toLowerCase().trim();
      const cname = String(c.name || c.displayName || '').toLowerCase().trim();
      const chex = String(c.hex || c.value || '').toLowerCase().trim();
      const chexClean = chex.replace(/^#/, '');

      return (targetVariantId && cid === targetVariantId.toLowerCase()) ||
        (targetColor && (chex === targetColor || chexClean === targetColor.replace(/^#/, '') || cname === targetColor)) ||
        (targetColorName && cname === targetColorName) ||
        (targetVariantName && cname === targetVariantName);
    });

    matchedColors.forEach((c: any) => {
      const cid = String(c._id || c.id || c.tempId || '').toLowerCase().trim();
      const cname = String(c.name || c.displayName || '').toLowerCase().trim();
      const chex = String(c.hex || c.value || '').toLowerCase().trim();
      if (cid) targetColorTokens.add(cid);
      if (cname) targetColorTokens.add(cname);
      if (chex) {
        targetColorTokens.add(chex);
        targetColorTokens.add(chex.replace(/^#/, ''));
      }
    });
  }

  // Enrich targetColorTokens from prod.variants
  if (Array.isArray(prod.variants) && prod.variants.length) {
    const matchedVariants = prod.variants.filter((v: any) => {
      if (!v) return false;
      const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
      const vname = String(v.name || '').toLowerCase().trim();
      const vhex = String(v.hex || '').toLowerCase().trim();
      const vhexClean = vhex.replace(/^#/, '');

      return (targetVariantId && vid === targetVariantId.toLowerCase()) ||
        (targetColor && (vhex === targetColor || vhexClean === targetColor.replace(/^#/, '') || vname === targetColor)) ||
        (targetColorName && vname === targetColorName) ||
        (targetVariantName && vname === targetVariantName);
    });

    matchedVariants.forEach((v: any) => {
      const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
      const vname = String(v.name || '').toLowerCase().trim();
      const vhex = String(v.hex || '').toLowerCase().trim();
      if (vid) targetColorTokens.add(vid);
      if (vname) targetColorTokens.add(vname);
      if (vhex) {
        targetColorTokens.add(vhex);
        targetColorTokens.add(vhex.replace(/^#/, ''));
      }
    });
  }

  // Helper to match a stock item's colorTempId
  const matchColor = (sColorTempId: any): boolean => {
    if (!sColorTempId) {
      return targetColorTokens.size === 0;
    }
    if (targetColorTokens.size === 0) return true;

    const sId = String(sColorTempId).trim().toLowerCase();
    const sIdClean = sId.replace(/^#/, '');
    if (targetColorTokens.has(sId) || targetColorTokens.has(sIdClean)) return true;

    // Check if sColorTempId points to a color in prod.colors that matches targetColorTokens
    if (Array.isArray(prod.colors)) {
      const col = prod.colors.find((c: any) => {
        if (!c) return false;
        const cid = String(c._id || c.id || c.tempId || '').toLowerCase().trim();
        const cname = String(c.name || c.displayName || '').toLowerCase().trim();
        const chex = String(c.hex || c.value || '').toLowerCase().trim();
        return cid === sId || cname === sId || chex === sId;
      });
      if (col) {
        const cid = String(col._id || col.id || col.tempId || '').toLowerCase().trim();
        const cname = String(col.name || col.displayName || '').toLowerCase().trim();
        const chex = String(col.hex || col.value || '').toLowerCase().trim();
        if (targetColorTokens.has(cid) || targetColorTokens.has(cname) || targetColorTokens.has(chex)) return true;
      }
    }

    return false;
  };

  // Collect target size tokens
  const targetSizeTokens = new Set<string>();
  if (targetSize) targetSizeTokens.add(targetSize);

  const sizesArr = Array.isArray(prod.sizesObjects) && prod.sizesObjects.length
    ? prod.sizesObjects
    : (Array.isArray(prod.sizes) ? prod.sizes : []);

  sizesArr.forEach((sz: any, idx: number) => {
    if (!sz) return;
    const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '').toLowerCase().trim() : String(sz).toLowerCase().trim();
    const szId = sz && typeof sz === 'object' ? String(sz.id || sz._id || '').toLowerCase().trim() : '';
    if (targetSize && (szVal === targetSize || szId === targetSize)) {
      targetSizeTokens.add(szVal);
      if (szId) targetSizeTokens.add(szId);
      targetSizeTokens.add(`size_legacy_${idx}`);
    }
  });

  // Helper to match a stock item's sizeId
  const matchSize = (sSizeId: any): boolean => {
    if (!sSizeId) return !targetSize;
    if (!targetSize) return true;

    const sId = String(sSizeId).trim().toLowerCase();
    if (targetSizeTokens.has(sId)) return true;

    // Check against sizesArr
    for (let idx = 0; idx < sizesArr.length; idx++) {
      const sz = sizesArr[idx];
      const szId = sz && typeof sz === 'object' ? String(sz.id || sz._id || `size_${idx}`).toLowerCase() : `size_${idx}`;
      const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '').toLowerCase().trim() : String(sz).toLowerCase().trim();

      if (sId === szId || sId === szVal || sId === `size_legacy_${idx}`) {
        if (!targetSize || szVal === targetSize) return true;
      }
    }

    return false;
  };

  const hasColorSelection = targetColorTokens.size > 0;
  const hasSizeSelection = targetSize !== '';

  // 1. Check exact match in stock array
  if (Array.isArray(prod.stock) && prod.stock.length > 0) {
    if (hasColorSelection && hasSizeSelection) {
      const exactMatch = prod.stock.find((st: any) => st && matchColor(st.colorTempId) && matchSize(st.sizeId));
      if (exactMatch) {
        return typeof exactMatch.quantity === 'number' ? Math.max(0, exactMatch.quantity) : 0;
      }
      // If both color & size were specified and stock matrix exists, but no entry matched:
      // This combination has 0 stock. Do NOT fall back to size total or product total!
      return 0;
    }

    // If only color was provided, sum for that color
    if (hasColorSelection && !hasSizeSelection) {
      const colorMatches = prod.stock.filter((st: any) => st && matchColor(st.colorTempId));
      if (colorMatches.length > 0) {
        return colorMatches.reduce((acc: number, st: any) => acc + (Number(st.quantity) || 0), 0);
      }
      return 0;
    }

    // If only size was provided and product has no colors
    if (!hasColorSelection && hasSizeSelection) {
      const sizeMatches = prod.stock.filter((st: any) => st && matchSize(st.sizeId));
      if (sizeMatches.length > 0) {
        return sizeMatches.reduce((acc: number, st: any) => acc + (Number(st.quantity) || 0), 0);
      }
    }
  }

  // 2. Check variants inventory (when no stock matrix)
  if (Array.isArray(prod.variants) && prod.variants.length > 0 && hasColorSelection) {
    const v = prod.variants.find((varItem: any) => {
      if (!varItem) return false;
      const vId = String(varItem._id || varItem.id || varItem.tempId || '').toLowerCase().trim();
      const vName = String(varItem.name || '').toLowerCase().trim();
      const vHex = String(varItem.hex || '').toLowerCase().trim();
      return targetColorTokens.has(vId) || targetColorTokens.has(vName) || targetColorTokens.has(vHex);
    });
    if (v && typeof v.inventory === 'number' && !Number.isNaN(v.inventory)) {
      return Math.max(0, v.inventory);
    }
  }

  // 3. Check sizes quantities (Fragrances, or single-color apparel)
  if (sizesArr.length > 0 && targetSize) {
    const sz = sizesArr.find((s: any) => {
      const val = s && typeof s === 'object' ? String(s.value || s.label || s.name || '').toLowerCase().trim() : String(s).toLowerCase().trim();
      const id = s && typeof s === 'object' ? String(s.id || s._id || '').toLowerCase().trim() : '';
      return val === targetSize || id === targetSize;
    });
    if (sz && typeof sz === 'object' && typeof sz.quantity === 'number' && !Number.isNaN(sz.quantity)) {
      return Math.max(0, sz.quantity);
    }
  }

  // 4. Fallback to top-level inventory or availableQuantity ONLY when no variant selection was made
  if (!hasColorSelection && !hasSizeSelection) {
    if (typeof prod.availableQuantity === 'number' && !Number.isNaN(prod.availableQuantity)) return Math.max(0, prod.availableQuantity);
    if (typeof prod.inventory === 'number' && !Number.isNaN(prod.inventory)) return Math.max(0, prod.inventory);
    if (typeof prod.inventory === 'string' && prod.inventory !== '' && !Number.isNaN(Number(prod.inventory))) return Math.max(0, Number(prod.inventory));
  }

  return 0;
}

export function getRemainingVariantStock(
  product: any,
  item?: {
    size?: string | null;
    color?: string | null;
    colorName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    variantHex?: string | null;
  },
  inCartQty: number = 0
): number {
  const availableStock = getAvailableStockForItem(product, item);
  return Math.max(0, availableStock - Math.max(0, inCartQty));
}

export function getAvailableQuantity(product: any, selectedSize?: string, selectedColor?: string): number {
  return getAvailableStockForItem(product, { size: selectedSize, color: selectedColor });
}

export function isOutOfStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  return getAvailableStockForItem(product, { size: selectedSize, color: selectedColor }) <= 0;
}

export function isLowStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  if (!product) return false;
  if (typeof product.isLowStock === 'boolean') return product.isLowStock;
  const viteRaw = (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_LOW_STOCK_THRESHOLD);
  const nodeRaw = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITE_LOW_STOCK_THRESHOLD) ? (process as any).env.VITE_LOW_STOCK_THRESHOLD : undefined;
  const raw = viteRaw || nodeRaw;
  const threshold = raw ? Number(raw) : 20;
  if (Number.isNaN(threshold)) return false;
  const qty = getAvailableStockForItem(product, { size: selectedSize, color: selectedColor });
  return qty > 0 && qty <= threshold;
}

/**
 * Resolves authoritative price for a product selection across 4 tiers:
 * 1. Combination Matrix: stock[].price
 * 2. Size / Volume: sizesObjects[].price or sizes[].price
 * 3. Variant: variants[].price
 * 4. Base Product: product.price
 */
export function getVariantPrice(
  product: any,
  item?: {
    size?: string | null;
    color?: string | null;
    colorName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    variantHex?: string | null;
  }
): number {
  if (!product) return 0;
  const basePrice = typeof product.price === 'number' ? product.price : Number(product.price || 0);

  const targetSize = item?.size ? String(item.size).trim().toLowerCase() : '';
  const targetColor = item?.color ? String(item.color).trim().toLowerCase() : '';
  const targetColorName = item?.colorName ? String(item.colorName).trim().toLowerCase() : '';
  const targetVariantId = item?.variantId ? String(item.variantId).trim().toLowerCase() : '';
  const targetVariantName = item?.variantName ? String(item.variantName).trim().toLowerCase() : '';
  const targetVariantHex = item?.variantHex ? String(item.variantHex).trim().toLowerCase() : '';

  const colorTokens = new Set<string>();
  if (targetVariantId) colorTokens.add(targetVariantId);
  if (targetColor) {
    colorTokens.add(targetColor);
    colorTokens.add(targetColor.replace(/^#/, ''));
  }
  if (targetColorName) colorTokens.add(targetColorName);
  if (targetVariantName) colorTokens.add(targetVariantName);
  if (targetVariantHex) {
    colorTokens.add(targetVariantHex);
    colorTokens.add(targetVariantHex.replace(/^#/, ''));
  }

  // Enrich color tokens from product.colors & variants
  if (Array.isArray(product.colors)) {
    product.colors.forEach((c: any) => {
      if (!c) return;
      const cid = String(c._id || c.id || c.tempId || '').toLowerCase().trim();
      const cname = String(c.name || c.displayName || '').toLowerCase().trim();
      const chex = String(c.hex || c.value || '').toLowerCase().trim();
      if ((targetVariantId && cid === targetVariantId) ||
          (targetColor && (chex === targetColor || chex.replace(/^#/, '') === targetColor.replace(/^#/, '') || cname === targetColor)) ||
          (targetColorName && cname === targetColorName)) {
        if (cid) colorTokens.add(cid);
        if (cname) colorTokens.add(cname);
        if (chex) { colorTokens.add(chex); colorTokens.add(chex.replace(/^#/, '')); }
      }
    });
  }

  if (Array.isArray(product.variants)) {
    product.variants.forEach((v: any) => {
      if (!v) return;
      const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
      const vname = String(v.name || '').toLowerCase().trim();
      const vhex = String(v.hex || '').toLowerCase().trim();
      if ((targetVariantId && vid === targetVariantId) ||
          (targetColor && (vhex === targetColor || vhex.replace(/^#/, '') === targetColor.replace(/^#/, '') || vname === targetColor)) ||
          (targetColorName && vname === targetColorName)) {
        if (vid) colorTokens.add(vid);
        if (vname) colorTokens.add(vname);
        if (vhex) { colorTokens.add(vhex); colorTokens.add(vhex.replace(/^#/, '')); }
      }
    });
  }

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  const hasColor = colorTokens.size > 0;
  const hasSize = targetSize !== '';

  // 1. Combination Matrix: Check stock[].price
  if (Array.isArray(product.stock) && product.stock.length > 0 && hasColor && hasSize) {
    const matchedStock = product.stock.find((st: any) => {
      if (!st) return false;
      const sCol = String(st.colorTempId || '').trim().toLowerCase();
      const sColClean = sCol.replace(/^#/, '');
      const colorMatches = !sCol || colorTokens.has(sCol) || colorTokens.has(sColClean);
      if (!colorMatches) return false;

      const sSizeId = String(st.sizeId || '').trim().toLowerCase();
      if (sSizeId === targetSize) return true;
      for (let idx = 0; idx < sizesArr.length; idx++) {
        const sz = sizesArr[idx];
        const szId = sz && typeof sz === 'object' ? String(sz.id || sz._id || `size_${idx}`).toLowerCase() : `size_${idx}`;
        const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '').toLowerCase().trim() : String(sz).toLowerCase().trim();
        if ((sSizeId === szId || sSizeId === szVal || sSizeId === `size_legacy_${idx}`) && szVal === targetSize) {
          return true;
        }
      }
      return false;
    });

    if (matchedStock && typeof matchedStock === 'object') {
      if (typeof matchedStock.price === 'number' && Number.isFinite(matchedStock.price) && matchedStock.price > 0) {
        return matchedStock.price;
      }
      if (typeof matchedStock.originalPrice === 'number' && Number.isFinite(matchedStock.originalPrice) && matchedStock.originalPrice > 0) {
        return matchedStock.originalPrice; // Cases A & E fallback
      }
    }
  }

  // 2. Size / Volume: Check sizes[].price or sizesObjects[].price
  if (hasSize && sizesArr.length > 0) {
    const matchedSize = sizesArr.find((s: any) => {
      if (!s) return false;
      const val = s && typeof s === 'object' ? String(s.value || s.label || s.name || '').toLowerCase().trim() : String(s).toLowerCase().trim();
      const id = s && typeof s === 'object' ? String(s.id || s._id || '').toLowerCase().trim() : '';
      return val === targetSize || (id && id === targetSize);
    });

    if (matchedSize && typeof matchedSize === 'object') {
      if (typeof matchedSize.price === 'number' && Number.isFinite(matchedSize.price) && matchedSize.price > 0) {
        return matchedSize.price;
      }
      if (typeof matchedSize.originalPrice === 'number' && Number.isFinite(matchedSize.originalPrice) && matchedSize.originalPrice > 0) {
        return matchedSize.originalPrice; // Cases A & E fallback
      }
    }
  }

  // 3. Variant / Color: Check variants[].price
  if (hasColor && Array.isArray(product.variants) && product.variants.length > 0) {
    const matchedVariant = product.variants.find((v: any) => {
      if (!v) return false;
      const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
      const vname = String(v.name || '').toLowerCase().trim();
      const vhex = String(v.hex || '').toLowerCase().trim();
      return colorTokens.has(vid) || colorTokens.has(vname) || colorTokens.has(vhex);
    });

    if (matchedVariant && typeof matchedVariant === 'object') {
      if (typeof matchedVariant.price === 'number' && Number.isFinite(matchedVariant.price) && matchedVariant.price > 0) {
        return matchedVariant.price;
      }
      if (typeof matchedVariant.originalPrice === 'number' && Number.isFinite(matchedVariant.originalPrice) && matchedVariant.originalPrice > 0) {
        return matchedVariant.originalPrice; // Cases A & E fallback
      }
    }
  }

  // 4. Fallback to base product price
  return Number.isFinite(basePrice) ? basePrice : 0;
}

/**
 * Resolves authoritative original / compare-at price for a product selection
 */
export function getVariantOriginalPrice(
  product: any,
  item?: {
    size?: string | null;
    color?: string | null;
    colorName?: string | null;
    variantId?: string | null;
    variantName?: string | null;
    variantHex?: string | null;
  }
): number | undefined {
  if (!product) return undefined;
  const rawBase = product.originalPrice || product.compareAtPrice;
  const baseOriginal = typeof rawBase === 'number' && Number.isFinite(rawBase)
    ? rawBase
    : (rawBase ? Number(rawBase) : undefined);

  const targetSize = item?.size ? String(item.size).trim().toLowerCase() : '';
  const targetColor = item?.color ? String(item.color).trim().toLowerCase() : '';
  const targetColorName = item?.colorName ? String(item.colorName).trim().toLowerCase() : '';
  const targetVariantId = item?.variantId ? String(item.variantId).trim().toLowerCase() : '';
  const targetVariantName = item?.variantName ? String(item.variantName).trim().toLowerCase() : '';
  const targetVariantHex = item?.variantHex ? String(item.variantHex).trim().toLowerCase() : '';

  const colorTokens = new Set<string>();
  if (targetVariantId) colorTokens.add(targetVariantId);
  if (targetColor) { colorTokens.add(targetColor); colorTokens.add(targetColor.replace(/^#/, '')); }
  if (targetColorName) colorTokens.add(targetColorName);
  if (targetVariantName) colorTokens.add(targetVariantName);
  if (targetVariantHex) { colorTokens.add(targetVariantHex); colorTokens.add(targetVariantHex.replace(/^#/, '')); }

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  const hasColor = colorTokens.size > 0;
  const hasSize = targetSize !== '';

  // 1. Stock combination
  if (Array.isArray(product.stock) && product.stock.length > 0 && hasColor && hasSize) {
    const matchedStock = product.stock.find((st: any) => {
      if (!st) return false;
      const sCol = String(st.colorTempId || '').trim().toLowerCase();
      const colorMatches = !sCol || colorTokens.has(sCol) || colorTokens.has(sCol.replace(/^#/, ''));
      if (!colorMatches) return false;
      const sSizeId = String(st.sizeId || '').trim().toLowerCase();
      if (sSizeId === targetSize) return true;
      for (let idx = 0; idx < sizesArr.length; idx++) {
        const sz = sizesArr[idx];
        const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '').toLowerCase().trim() : String(sz).toLowerCase().trim();
        if (szVal === targetSize) return true;
      }
      return false;
    });

    if (matchedStock && typeof matchedStock.originalPrice === 'number' && Number.isFinite(matchedStock.originalPrice) && matchedStock.originalPrice > 0) {
      return matchedStock.originalPrice;
    }
  }

  // 2. Size
  if (hasSize && sizesArr.length > 0) {
    const matchedSize = sizesArr.find((s: any) => {
      if (!s) return false;
      const val = s && typeof s === 'object' ? String(s.value || s.label || s.name || '').toLowerCase().trim() : String(s).toLowerCase().trim();
      const id = s && typeof s === 'object' ? String(s.id || s._id || '').toLowerCase().trim() : '';
      return val === targetSize || (id && id === targetSize);
    });

    if (matchedSize && typeof matchedSize === 'object' && typeof matchedSize.originalPrice === 'number' && Number.isFinite(matchedSize.originalPrice) && matchedSize.originalPrice > 0) {
      return matchedSize.originalPrice;
    }
  }

  // 3. Variant
  if (hasColor && Array.isArray(product.variants) && product.variants.length > 0) {
    const matchedVariant = product.variants.find((v: any) => {
      if (!v) return false;
      const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
      const vname = String(v.name || '').toLowerCase().trim();
      const vhex = String(v.hex || '').toLowerCase().trim();
      return colorTokens.has(vid) || colorTokens.has(vname) || colorTokens.has(vhex);
    });

    if (matchedVariant && typeof matchedVariant.originalPrice === 'number' && Number.isFinite(matchedVariant.originalPrice) && matchedVariant.originalPrice > 0) {
      return matchedVariant.originalPrice;
    }
  }

  return baseOriginal;
}

/**
 * Checks if a product has any variant-specific pricing defined
 */
export function hasVariantPricing(product: any): boolean {
  if (!product) return false;
  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  const hasSizePrice = sizesArr.some((s: any) => s && typeof s === 'object' && ((typeof s.price === 'number' && s.price > 0) || (typeof s.originalPrice === 'number' && s.originalPrice > 0)));
  if (hasSizePrice) return true;

  if (Array.isArray(product.variants) && product.variants.some((v: any) => v && ((typeof v.price === 'number' && v.price > 0) || (typeof v.originalPrice === 'number' && v.originalPrice > 0)))) {
    return true;
  }

  if (Array.isArray(product.stock) && product.stock.some((st: any) => st && ((typeof st.price === 'number' && st.price > 0) || (typeof st.originalPrice === 'number' && st.originalPrice > 0)))) {
    return true;
  }

  return false;
}

/**
 * Gets the lowest starting price for a product across all variants
 */
export function getMinProductPrice(product: any): number {
  if (!product) return 0;
  const basePrice = typeof product.price === 'number' ? product.price : Number(product.price || 0);
  let min = basePrice;

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  sizesArr.forEach((s: any) => {
    if (s && typeof s === 'object') {
      const p = (typeof s.price === 'number' && s.price > 0) ? s.price : (typeof s.originalPrice === 'number' && s.originalPrice > 0 ? s.originalPrice : null);
      if (p !== null && (min === 0 || p < min)) min = p;
    }
  });

  if (Array.isArray(product.variants)) {
    product.variants.forEach((v: any) => {
      if (v) {
        const p = (typeof v.price === 'number' && v.price > 0) ? v.price : (typeof v.originalPrice === 'number' && v.originalPrice > 0 ? v.originalPrice : null);
        if (p !== null && (min === 0 || p < min)) min = p;
      }
    });
  }

  if (Array.isArray(product.stock)) {
    product.stock.forEach((st: any) => {
      if (st) {
        const p = (typeof st.price === 'number' && st.price > 0) ? st.price : (typeof st.originalPrice === 'number' && st.originalPrice > 0 ? st.originalPrice : null);
        if (p !== null && (min === 0 || p < min)) min = p;
      }
    });
  }

  return min;
}

export default {
  getAvailableStockForItem,
  getRemainingVariantStock,
  getAvailableQuantity,
  isOutOfStock,
  isLowStock,
  getVariantPrice,
  getVariantOriginalPrice,
  hasVariantPricing,
  getMinProductPrice
};
