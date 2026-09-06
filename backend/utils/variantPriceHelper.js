/**
 * Universal Variant Pricing Helper
 * Authoritative 4-tier price resolution for products and variants:
 * 1. Combination Matrix: stock[].price (matching color + size)
 * 2. Size / Volume: sizes[].price (e.g. 50ml, 100ml, 200ml)
 * 3. Variant / Style: variants[].price (matching color / variantId)
 * 4. Base Product Price: product.price
 */

const normalizeToken = (val) => (val != null ? String(val).trim().toLowerCase() : '');

function collectColorTokens(product, item = {}) {
  const tokens = new Set();
  const targetColor = normalizeToken(item.color);
  const targetColorName = normalizeToken(item.colorName);
  const targetVariantId = normalizeToken(item.variantId || (item.color && typeof item.color === 'object' ? item.color._id || item.color.id || item.color.tempId : ''));
  const targetVariantName = normalizeToken(item.variantName);
  const targetVariantHex = normalizeToken(item.variantHex || (item.color && typeof item.color === 'object' ? item.color.hex : ''));

  if (targetVariantId) tokens.add(targetVariantId);
  if (targetColor) {
    tokens.add(targetColor);
    tokens.add(targetColor.replace(/^#/, ''));
  }
  if (targetColorName) tokens.add(targetColorName);
  if (targetVariantName) tokens.add(targetVariantName);
  if (targetVariantHex) {
    tokens.add(targetVariantHex);
    tokens.add(targetVariantHex.replace(/^#/, ''));
  }

  // Enrich from product.colors
  if (Array.isArray(product?.colors)) {
    product.colors.forEach((c) => {
      if (!c) return;
      const cid = normalizeToken(c._id || c.id || c.tempId);
      const cname = normalizeToken(c.name || c.displayName);
      const chex = normalizeToken(c.hex || c.value);
      const chexClean = chex.replace(/^#/, '');

      const isMatch = (targetVariantId && cid === targetVariantId) ||
        (targetColor && (chex === targetColor || chexClean === targetColor.replace(/^#/, '') || cname === targetColor)) ||
        (targetColorName && cname === targetColorName) ||
        (targetVariantName && cname === targetVariantName);

      if (isMatch) {
        if (cid) tokens.add(cid);
        if (cname) tokens.add(cname);
        if (chex) {
          tokens.add(chex);
          tokens.add(chexClean);
        }
      }
    });
  }

  // Enrich from product.variants
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((v) => {
      if (!v) return;
      const vid = normalizeToken(v._id || v.id || v.tempId);
      const vname = normalizeToken(v.name);
      const vhex = normalizeToken(v.hex);
      const vhexClean = vhex.replace(/^#/, '');

      const isMatch = (targetVariantId && vid === targetVariantId) ||
        (targetColor && (vhex === targetColor || vhexClean === targetColor.replace(/^#/, '') || vname === targetColor)) ||
        (targetColorName && vname === targetColorName) ||
        (targetVariantName && vname === targetVariantName);

      if (isMatch) {
        if (vid) tokens.add(vid);
        if (vname) tokens.add(vname);
        if (vhex) {
          tokens.add(vhex);
          tokens.add(vhexClean);
        }
      }
    });
  }

  return tokens;
}

function matchColorTempId(sColorTempId, targetColorTokens) {
  if (!sColorTempId) return targetColorTokens.size === 0;
  if (targetColorTokens.size === 0) return true;
  const sId = normalizeToken(sColorTempId);
  const sIdClean = sId.replace(/^#/, '');
  return targetColorTokens.has(sId) || targetColorTokens.has(sIdClean);
}

function matchSizeToken(sSizeId, targetSize, sizesArr) {
  if (!sSizeId) return !targetSize;
  if (!targetSize) return true;
  const sId = normalizeToken(sSizeId);
  if (sId === targetSize) return true;

  for (let idx = 0; idx < sizesArr.length; idx++) {
    const sz = sizesArr[idx];
    if (!sz) continue;
    const szId = normalizeToken(typeof sz === 'object' ? sz.id || sz._id || `size_${idx}` : `size_${idx}`);
    const szVal = normalizeToken(typeof sz === 'object' ? sz.value || sz.label || sz.name : sz);
    const legacyId = `size_legacy_${idx}`;

    if (sId === szId || sId === szVal || sId === legacyId) {
      if (!targetSize || szVal === targetSize) return true;
    }
  }

  return false;
}

/**
 * Resolves the authoritative price for a product selection
 */
export function getVariantPrice(product, item = {}) {
  if (!product) return 0;
  const basePrice = Number(product.price);

  const targetSize = normalizeToken(item.size);
  const targetColorTokens = collectColorTokens(product, item);
  const hasColor = targetColorTokens.size > 0;
  const hasSize = targetSize !== '';

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  // 1. Combination Matrix: Check stock[].price (or fallback to stock[].originalPrice) for exact color + size match
  if (Array.isArray(product.stock) && product.stock.length > 0 && hasColor && hasSize) {
    const matchedStock = product.stock.find(
      (st) => st && matchColorTempId(st.colorTempId, targetColorTokens) && matchSizeToken(st.sizeId, targetSize, sizesArr)
    );
    if (matchedStock && typeof matchedStock === 'object') {
      if (typeof matchedStock.price === 'number' && Number.isFinite(matchedStock.price) && matchedStock.price > 0) {
        return matchedStock.price;
      }
      if (typeof matchedStock.originalPrice === 'number' && Number.isFinite(matchedStock.originalPrice) && matchedStock.originalPrice > 0) {
        return matchedStock.originalPrice; // Cases A & E: Sells for Actual/Original price
      }
    }
  }

  // 2. Size / Volume: Check sizes[].price (or fallback to sizes[].originalPrice) for size/volume match
  if (hasSize && sizesArr.length > 0) {
    const matchedSize = sizesArr.find((s) => {
      if (!s) return false;
      const val = normalizeToken(typeof s === 'object' ? s.value || s.label || s.name : s);
      const id = normalizeToken(typeof s === 'object' ? s.id || s._id : '');
      return val === targetSize || (id && id === targetSize);
    });
    if (matchedSize && typeof matchedSize === 'object') {
      if (typeof matchedSize.price === 'number' && Number.isFinite(matchedSize.price) && matchedSize.price > 0) {
        return matchedSize.price;
      }
      if (typeof matchedSize.originalPrice === 'number' && Number.isFinite(matchedSize.originalPrice) && matchedSize.originalPrice > 0) {
        return matchedSize.originalPrice; // Cases A & E: Sells for Actual/Original price
      }
    }
  }

  // 3. Variant / Color: Check variants[].price (or fallback to variants[].originalPrice) for color/variant match
  if (hasColor && Array.isArray(product.variants) && product.variants.length > 0) {
    const matchedVariant = product.variants.find((v) => {
      if (!v) return false;
      const vid = normalizeToken(v._id || v.id || v.tempId);
      const vname = normalizeToken(v.name);
      const vhex = normalizeToken(v.hex);
      return targetColorTokens.has(vid) || targetColorTokens.has(vname) || targetColorTokens.has(vhex);
    });
    if (matchedVariant && typeof matchedVariant === 'object') {
      if (typeof matchedVariant.price === 'number' && Number.isFinite(matchedVariant.price) && matchedVariant.price > 0) {
        return matchedVariant.price;
      }
      if (typeof matchedVariant.originalPrice === 'number' && Number.isFinite(matchedVariant.originalPrice) && matchedVariant.originalPrice > 0) {
        return matchedVariant.originalPrice; // Cases A & E: Sells for Actual/Original price
      }
    }
  }

  // 4. Fallback to base product price
  return Number.isFinite(basePrice) ? basePrice : 0;
}

/**
 * Resolves the original / compare-at price for a product selection
 */
export function getVariantOriginalPrice(product, item = {}) {
  if (!product) return undefined;
  const rawBaseOriginal = product.originalPrice || product.compareAtPrice;
  const baseOriginalPrice = (typeof rawBaseOriginal === 'number' && Number.isFinite(rawBaseOriginal))
    ? rawBaseOriginal
    : (rawBaseOriginal ? Number(rawBaseOriginal) : undefined);

  const targetSize = normalizeToken(item.size);
  const targetColorTokens = collectColorTokens(product, item);
  const hasColor = targetColorTokens.size > 0;
  const hasSize = targetSize !== '';

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  // 1. Combination Matrix
  if (Array.isArray(product.stock) && product.stock.length > 0 && hasColor && hasSize) {
    const matchedStock = product.stock.find(
      (st) => st && matchColorTempId(st.colorTempId, targetColorTokens) && matchSizeToken(st.sizeId, targetSize, sizesArr)
    );
    if (matchedStock && typeof matchedStock.originalPrice === 'number' && Number.isFinite(matchedStock.originalPrice) && matchedStock.originalPrice > 0) {
      return matchedStock.originalPrice;
    }
  }

  // 2. Size / Volume
  if (hasSize && sizesArr.length > 0) {
    const matchedSize = sizesArr.find((s) => {
      if (!s) return false;
      const val = normalizeToken(typeof s === 'object' ? s.value || s.label || s.name : s);
      const id = normalizeToken(typeof s === 'object' ? s.id || s._id : '');
      return val === targetSize || (id && id === targetSize);
    });
    if (matchedSize && typeof matchedSize === 'object' && typeof matchedSize.originalPrice === 'number' && Number.isFinite(matchedSize.originalPrice) && matchedSize.originalPrice > 0) {
      return matchedSize.originalPrice;
    }
  }

  // 3. Variant / Color
  if (hasColor && Array.isArray(product.variants) && product.variants.length > 0) {
    const matchedVariant = product.variants.find((v) => {
      if (!v) return false;
      const vid = normalizeToken(v._id || v.id || v.tempId);
      const vname = normalizeToken(v.name);
      const vhex = normalizeToken(v.hex);
      return targetColorTokens.has(vid) || targetColorTokens.has(vname) || targetColorTokens.has(vhex);
    });
    if (matchedVariant && typeof matchedVariant.originalPrice === 'number' && Number.isFinite(matchedVariant.originalPrice) && matchedVariant.originalPrice > 0) {
      return matchedVariant.originalPrice;
    }
  }

  return baseOriginalPrice;
}

/**
 * Checks if a product has any variant-specific pricing configured
 */
export function hasVariantPricing(product) {
  if (!product) return false;
  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  const hasSizePrice = sizesArr.some((s) => s && typeof s === 'object' && ((typeof s.price === 'number' && s.price > 0) || (typeof s.originalPrice === 'number' && s.originalPrice > 0)));
  if (hasSizePrice) return true;

  if (Array.isArray(product.variants) && product.variants.some((v) => v && ((typeof v.price === 'number' && v.price > 0) || (typeof v.originalPrice === 'number' && v.originalPrice > 0)))) {
    return true;
  }

  if (Array.isArray(product.stock) && product.stock.some((st) => st && ((typeof st.price === 'number' && st.price > 0) || (typeof st.originalPrice === 'number' && st.originalPrice > 0)))) {
    return true;
  }

  return false;
}

/**
 * Gets the lowest starting price for a product across all variants
 */
export function getMinProductPrice(product) {
  if (!product) return 0;
  const basePrice = typeof product.price === 'number' ? product.price : Number(product.price || 0);
  let min = basePrice;

  const sizesArr = Array.isArray(product.sizesObjects) && product.sizesObjects.length
    ? product.sizesObjects
    : (Array.isArray(product.sizes) ? product.sizes : []);

  sizesArr.forEach((s) => {
    if (s && typeof s === 'object') {
      const p = (typeof s.price === 'number' && s.price > 0) ? s.price : (typeof s.originalPrice === 'number' && s.originalPrice > 0 ? s.originalPrice : null);
      if (p !== null && (min === 0 || p < min)) min = p;
    }
  });

  if (Array.isArray(product.variants)) {
    product.variants.forEach((v) => {
      if (v) {
        const p = (typeof v.price === 'number' && v.price > 0) ? v.price : (typeof v.originalPrice === 'number' && v.originalPrice > 0 ? v.originalPrice : null);
        if (p !== null && (min === 0 || p < min)) min = p;
      }
    });
  }

  if (Array.isArray(product.stock)) {
    product.stock.forEach((st) => {
      if (st) {
        const p = (typeof st.price === 'number' && st.price > 0) ? st.price : (typeof st.originalPrice === 'number' && st.originalPrice > 0 ? st.originalPrice : null);
        if (p !== null && (min === 0 || p < min)) min = p;
      }
    });
  }

  return min;
}

export default {
  getVariantPrice,
  getVariantOriginalPrice,
  hasVariantPricing,
  getMinProductPrice
};

