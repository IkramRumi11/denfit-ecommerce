// backend/utils/adminProductHelper.js
import { normalizeAttributesInput } from './attributes.js';

// Safe JSON parse helper
export const safeParse = (val) => {
  if (val === undefined || val === null) return val;
  if (typeof val !== 'string') return val;
  let s = val.trim();
  for (let i = 0; i < 5; i++) {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') { s = parsed; continue; }
      return parsed;
    } catch (e) {
      try {
        const cleaned = s.replace(/`/g, '').trim();
        if (/^[[{].*[\]}]$/.test(cleaned)) {
          const parsed = JSON.parse(cleaned.replace(/'/g, '"'));
          if (typeof parsed === 'string') { s = parsed; continue; }
          return parsed;
        }
      } catch (e2) {}
      break;
    }
  }
  return val;
};

// Safe Tag normalization helper
export const normalizeTags = (input) => {
  if (input === undefined || input === null) return [];
  const unwrap = (v, depth = 0) => {
    if (depth > 6) return [];
    if (Array.isArray(v)) return v.flatMap(x => unwrap(x, depth + 1));
    if (typeof v === 'string') {
      let s = v.trim();
      for (let i = 0; i < 5; i++) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.flatMap(x => unwrap(x, depth + 1));
          if (typeof parsed === 'string') { s = parsed; continue; }
          return [String(parsed)];
        } catch (e) {
          break;
        }
      }
      if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
      s = s.replace(/^['`"]+|['`"]+$/g, '').trim();
      return s ? [s] : [];
    }
    return [String(v)];
  };
  const out = unwrap(input).map(t => String(t).trim()).filter(Boolean);
  return Array.from(new Set(out));
};

// Slugify helper
export const slugify = (input) => {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// SKU generator
export const generateSKU = (category, brand) => {
  const timestamp = Date.now().toString().slice(-6);
  const catCode = category.slice(0, 3).toUpperCase();
  const brandCode = brand.slice(0, 3).toUpperCase();
  return `${catCode}-${brandCode}-${timestamp}`;
};

// Normalize core product fields
export const normalizeProductInput = async (body, ProductModel) => {
  const productData = { ...body };

  // 1. Images
  if (productData.images && typeof productData.images === 'string') {
    const parsed = safeParse(productData.images);
    if (Array.isArray(parsed)) {
      productData.images = parsed.map((it) => (typeof it === 'string' ? { url: it } : it));
    } else if (typeof parsed === 'string' && parsed.includes('__file__')) {
      productData.images = [];
    }
  }

  // 2. Inventory
  try {
    if (productData.inventory !== undefined && typeof productData.inventory === 'string') {
      const t = productData.inventory.trim();
      if (t !== '' && !Number.isNaN(Number(t))) {
        productData.inventory = Number(t);
      }
    }
  } catch (e) {}

  // 3. Sizes
  if (productData.sizes && typeof productData.sizes === 'string') {
    productData.sizes = safeParse(productData.sizes);
  }
  if (Array.isArray(productData.sizes)) {
    productData.sizes = productData.sizes.map((sz, i) => {
      if (!sz) return null;
      if (typeof sz === 'string') return { id: `size_legacy_${i}`, value: sz, inStock: true, quantity: null };
      const q = (sz.quantity != null && !Number.isNaN(Number(sz.quantity))) ? Number(sz.quantity) : (sz.qty != null && !Number.isNaN(Number(sz.qty)) ? Number(sz.qty) : null);
      return {
        id: sz.id || `size_${i}`,
        value: sz.value ?? (sz.label || sz.name || ''),
        inStock: typeof sz.inStock === 'boolean' ? sz.inStock : true,
        quantity: q
      };
    }).filter(Boolean);
  }

  // 4. Attributes
  if (productData.attributes !== undefined) {
    productData.attributes = normalizeAttributesInput(productData.attributes);
  }

  // 5. Tags
  if (productData.tags) {
    try {
      productData.tags = normalizeTags(productData.tags);
    } catch (e) {
      productData.tags = Array.isArray(productData.tags) ? productData.tags.map(String) : String(productData.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // 6. Size Guide
  if (productData.sizeGuide && typeof productData.sizeGuide === 'string') {
    try {
      productData.sizeGuide = safeParse(productData.sizeGuide) || productData.sizeGuide;
    } catch (e) {}
  }
  try {
    if (productData.sizeGuide && typeof productData.sizeGuide === 'object' && productData.sizeGuide.tableHtml) {
      productData.sizeGuide.tableHtml = String(productData.sizeGuide.tableHtml).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    }
  } catch (e) {}

  // 7. Stock mapping
  if (productData.stock && typeof productData.stock === 'string') {
    const parsedStock = safeParse(productData.stock);
    if (Array.isArray(parsedStock)) {
      productData.stock = parsedStock.map((st) => {
        if (!st) return null;
        const qty = (st.quantity != null && !Number.isNaN(Number(st.quantity))) ? Number(st.quantity) : (st.qty != null && !Number.isNaN(Number(st.qty)) ? Number(st.qty) : null);
        return {
          colorTempId: st.colorTempId || st.color || st.color_id || (st.colorTemp || null),
          sizeId: st.sizeId || st.size || st.size_id || null,
          quantity: qty
        };
      }).filter(Boolean);
    }
  }

  // 8. Specifications & SEO
  if (productData.specifications && typeof productData.specifications === 'string') {
    productData.specifications = safeParse(productData.specifications);
  }
  if (productData.seo && typeof productData.seo === 'string') {
    productData.seo = safeParse(productData.seo);
  }

  // 9. Related Products
  if (productData.relatedProducts && typeof productData.relatedProducts === 'string') {
    const rp = safeParse(productData.relatedProducts);
    if (Array.isArray(rp)) {
      productData.relatedProducts = rp.map((entry) => {
        if (typeof entry === 'string') {
          const e = entry.trim();
          if ((e.startsWith('[') || e.startsWith('{')) && (e.endsWith(']') || e.endsWith('}'))) {
            try {
              const inner = JSON.parse(e.replace(/'/g, '"'));
              if (Array.isArray(inner) && inner.length) return inner[0];
              if (typeof inner === 'string') return inner;
            } catch (err) {}
          }
          return e.replace(/^['`"]+|['`"]+$/g, '');
        }
        return entry;
      });
    }
  }

  if (Array.isArray(productData.relatedProducts) && productData.relatedProducts.length && ProductModel) {
    const nonObjectIds = productData.relatedProducts.filter(r => typeof r === 'string' && !/^[a-fA-F0-9]{24}$/.test(r));
    if (nonObjectIds.length) {
      const cleaned = nonObjectIds.map(s => String(s).replace(/[^A-Za-z0-9-]/g, ''));
      try {
        const found = await ProductModel.find({ sku: { $in: cleaned } }, '_id sku');
        if (found && found.length) {
          const skuToId = {};
          found.forEach(p => { skuToId[p.sku] = p._id; });
          productData.relatedProducts = productData.relatedProducts.map(entry => {
            if (typeof entry === 'string') {
              if (/^[a-fA-F0-9]{24}$/.test(entry)) return entry;
              if (skuToId[entry]) return skuToId[entry];
              const c = entry.replace(/[^A-Za-z0-9-]/g, '');
              if (skuToId[c]) return skuToId[c];
              return null;
            }
            return entry;
          }).filter(Boolean);
        }
      } catch (e) {}
    }
  }

  // 10. Normalizing category, subcategory and SKU
  if (productData.category) {
    try { productData.categorySlug = slugify(productData.category); } catch (e) {}
  }
  if (productData.brand) {
    try { productData.brandSlug = slugify(productData.brand); } catch (e) {}
  }
  if (productData.collectionName) {
    try { productData.collectionSlug = slugify(productData.collectionName); } catch (e) {}
  }
  if (!productData.sku && productData.category) {
    productData.sku = generateSKU(productData.category, productData.brand || 'GEN');
  }

  return productData;
};

// Map files to variants
export const mapFilesToVariants = (files, parsedVariants, baseUrl) => {
  if (!files || !files.length) return parsedVariants;

  if (!parsedVariants.length) {
    parsedVariants.push({ tempId: 'default', name: 'Default', hex: '', images: [], swatchImage: '' });
  }

  for (const f of files) {
    const field = f.fieldname || 'files';
    const url = `${baseUrl}/uploads/${f.filename}`;

    // Match variantImages_<tempId> or variantImages_<tempId>_<idx>
    let m = field.match(/^variantImages_(.+?)(?:_(\d+))?$/);
    if (m) {
      let id = m[1];
      const idxCaptured = m[2];
      let v = parsedVariants.find(x => String(x.tempId) === String(id) || String(x._id) === String(id));
      if (!v) {
        try {
          const decoded = decodeURIComponent(id);
          v = parsedVariants.find(x => String(x.tempId) === String(decoded) || String(x._id) === String(decoded));
        } catch (e) {}
      }
      if (!v && /^\d+$/.test(id)) {
        const numeric = Number(id);
        if (numeric >= 0 && numeric < parsedVariants.length) v = parsedVariants[numeric];
      }
      if (!v) {
        v = parsedVariants.find(x => (x.name || '').toLowerCase() === String(id).toLowerCase());
      }

      const target = v || parsedVariants[0];
      const order = (target.images && target.images.length) ? target.images.length : 0;
      target.images = (target.images || []).concat({ url, filename: f.filename, publicId: null, isPrimary: order === 0, order, fromField: field, idxCaptured });
      continue;
    }

    m = field.match(/^variantSwatch_(.+)$/);
    if (m) {
      let id = m[1];
      let v = parsedVariants.find(x => String(x.tempId) === String(id) || String(x._id) === String(id));
      if (!v) {
        try { v = parsedVariants.find(x => String(x.tempId) === String(decodeURIComponent(id))); } catch (e) {}
      }
      if (!v && /^\d+$/.test(id)) {
        const numeric = Number(id);
        if (numeric >= 0 && numeric < parsedVariants.length) v = parsedVariants[numeric];
      }
      const target = v || parsedVariants[0];
      target.swatchImage = { url, filename: f.filename, publicId: null, fromField: field };
      continue;
    }

    // Generic files (no variant prefix) -> attach to first variant images
    const target = parsedVariants[0];
    const order = (target.images && target.images.length) ? target.images.length : 0;
    target.images = (target.images || []).concat({ url, filename: f.filename, publicId: null, isPrimary: order === 0, order, fromField: field });
  }

  // Deduplicate and filter out placeholders
  const seen = new Set();
  const dedup = [];
  for (const v of parsedVariants) {
    const id = String(v.tempId || v._id || '');
    if (seen.has(id)) continue;
    seen.add(id);
    v.images = Array.isArray(v.images) ? v.images.map((it) => {
      if (!it) return null;
      if (typeof it === 'string') {
        if (it.includes('__file__')) return null;
        return { url: it };
      }
      return it;
    }).filter(Boolean) : [];
    dedup.push(v);
  }

  return dedup;
};
