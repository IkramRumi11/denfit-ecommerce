import Product from '../models/Product.js';
import Category from '../models/Category.js';
import DetailTemplate from '../models/DetailTemplate.js';
import SystemSetting from '../models/SystemSetting.js';
import { computeAvailableQuantity, computeIsLowStock, computeIsOutOfStock } from '../utils/inventory.js';
import { getColorName } from '../utils/colorHelper.js';
import { normalizeBrandName } from '../utils/brandHelper.js';
import { slugify } from '../utils/adminProductHelper.js';

const parseArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normalize a product document or plain object for client consumption.
// Keeps sizes simple, normalizes colors to objects when possible, and computes a `primaryImage`.
const normalizeProductForClient = (doc) => {
  if (!doc) return doc;
  const obj = (doc && typeof doc.toJSON === 'function') ? doc.toJSON() : JSON.parse(JSON.stringify(doc || {}));

  // Normalize sizes
  try {
    if (Array.isArray(obj.sizes) && obj.sizes.length && typeof obj.sizes[0] === 'object') {
      obj.sizesObjects = JSON.parse(JSON.stringify(obj.sizes));
      obj.sizes = obj.sizes.map(s => (s && (s.value || s.label || s.name)) ? (s.value || s.label || s.name) : String(s));
    }
  } catch (e) { /* best-effort */ }

  // Normalize colors
  try {
    if (Array.isArray(obj.colors)) {
      obj.colors = obj.colors.map((c) => {
        if (!c) return c;
        if (typeof c === 'string') {
          const name = getColorName(c);
          return { name: name || c, value: c, hex: c.startsWith('#') ? c : undefined };
        }
        if (typeof c === 'object') {
          const raw = c.name || c.displayName || c.value || c.hex || '';
          const name = getColorName(raw);
          return {
            ...c,
            name: name || c.name || 'Default'
          };
        }
        return c;
      });
    }
  } catch (e) { /* ignore */ }

  // Normalize variants
  try {
    if (Array.isArray(obj.variants)) {
      obj.variants = obj.variants.map((v) => {
        if (!v) return v;
        const raw = v.name || v.hex || '';
        const name = getColorName(raw);
        return {
          ...v,
          name: name || v.name || 'Default'
        };
      });
    }
  } catch (e) { /* ignore */ }

  // Primary image: first variant image, otherwise first image
  try {
    let primary = '';
    if (Array.isArray(obj.variants) && obj.variants.length) {
      const v = obj.variants.find(vv => Array.isArray(vv.images) && vv.images.length) || obj.variants[0];
      if (v && Array.isArray(v.images) && v.images.length) primary = v.images[0].url || (typeof v.images[0] === 'string' ? v.images[0] : '');
    }
    if (!primary && Array.isArray(obj.images) && obj.images.length) {
      const first = obj.images[0];
      primary = typeof first === 'string' ? first : (first && first.url) ? first.url : '';
    }
    obj.primaryImage = primary || '';
  } catch (e) { obj.primaryImage = obj.primaryImage || ''; }

  return obj;
};

export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      brand,
      brandSlug,
      collection,
      collectionSlug,
      featured,
      minPrice,
      maxPrice,
      tags,
      search,
      sort,
      page = 1,
      limit = 20,
      gender,
      sizes,
      colors,
      inStock,
      subcategory,
      // ─── NEW FILTER PARAMS ───
      availability,    // 'in-stock,low-stock' — multi-select
      ageGroup,        // 'kids,baby' — multi-select
      minRating,       // '4' — minimum average rating
      discount,        // '20' — minimum discount percentage
      discountTags,    // 'sale,trending' — promotional tags
    } = req.query || {};

    const appliedLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    const appliedPage = Math.max(1, Number(page) || 1);

    const mongoQuery = {};
    const andClauses = [];

    // Category / Subcategory matching: check category, categorySlug, subcategory, tags, and product name
    const catSearch = subcategory || category;
    if (catSearch) {
      const catStr = String(catSearch).trim();
      const escaped = escapeRegex(catStr);
      const singular = catStr.endsWith('s') && catStr.length > 2 ? catStr.slice(0, -1) : catStr;
      const regexPattern = new RegExp(`(^|\\b|[-_])${escapeRegex(singular)}`, 'i');

      andClauses.push({
        $or: [
          { category: { $regex: regexPattern } },
          { categorySlug: { $regex: regexPattern } },
          { subcategory: { $regex: regexPattern } },
          { tags: { $in: [new RegExp(`^${escaped}$`, 'i'), new RegExp(`^${escapeRegex(singular)}$`, 'i'), regexPattern] } },
          { name: { $regex: regexPattern } }
        ]
      });
    }

    // Gender / Collection matching: include unisex and accessories flexibly
    if (gender) {
      const g = String(gender).toLowerCase().trim();
      if (g === 'men') {
        andClauses.push({
          $or: [
            { gender: { $in: ['men', 'unisex', 'Men', 'Unisex', 'accessories', 'Accessories'] } },
            { gender: { $exists: false } }
          ]
        });
      } else if (g === 'women') {
        andClauses.push({
          $or: [
            { gender: { $in: ['women', 'unisex', 'Women', 'Unisex', 'accessories', 'Accessories'] } },
            { gender: { $exists: false } }
          ]
        });
      } else if (g === 'kids') {
        andClauses.push({
          $or: [
            { gender: { $in: ['kids', 'boys', 'girls', 'baby', 'unisex', 'Kids', 'Boys', 'Girls', 'Baby', 'Unisex'] } },
            { ageGroup: { $in: ['kids', 'baby', 'toddler'] } }
          ]
        });
      } else if (g === 'accessories') {
        andClauses.push({
          $or: [
            { gender: { $in: ['accessories', 'unisex', 'Accessories', 'Unisex', 'men', 'women'] } },
            { category: { $regex: /accessories|bags|wallets|belts|watches|sunglasses|hats|jewel/i } },
            { categorySlug: { $regex: /accessories|bags|wallets|belts|watches|sunglasses|hats|jewel/i } },
            { subcategory: { $regex: /accessories|bags|wallets|belts|watches|sunglasses|hats|jewel/i } },
            { tags: { $in: ['accessories', 'bags', 'bag', 'wallet', 'belt', 'watch', 'sunglasses', 'hat'] } }
          ]
        });
      } else if (g === 'sale') {
        andClauses.push({
          $or: [
            { isOnSale: true },
            { onSale: true },
            { discountPercentage: { $gt: 0 } },
            { originalPrice: { $exists: true, $gt: 0 } },
            { discountTags: { $in: ['sale', 'clearance', 'discount'] } }
          ]
        });
      } else if (g === 'brands' || g === 'brand') {
        // If gender is passed as 'brands', match all branded products
        andClauses.push({
          brand: { $exists: true, $ne: null, $nin: ['', null] }
        });
      } else {
        andClauses.push({ gender: new RegExp(`^${escapeRegex(g)}$`, 'i') });
      }
    }

    // Brand — support single, multi-select (comma-separated), or slug
    let reqBrand = brand;
    if (!reqBrand && req.query.H !== undefined && req.query.M !== undefined) {
      reqBrand = 'H&M';
    } else if (reqBrand === 'H' && req.query.M !== undefined) {
      reqBrand = 'H&M';
    }

    const brandArr = parseArray(reqBrand);
    if (brandArr.length === 1) {
      const b = brandArr[0];
      const safeB = escapeRegex(b);
      const canonical = normalizeBrandName(b);
      const bSlug = slugify(b);
      const bStripped = String(b).toLowerCase().replace(/[^a-z0-9]+/g, '');
      const bDash = String(b).toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const brandClauses = [
        { brand: new RegExp(`^${safeB}$`, 'i') },
        { brand: new RegExp(`^${escapeRegex(canonical)}$`, 'i') },
        { brand: new RegExp(safeB, 'i') },
        { brandSlug: bSlug },
        { brandSlug: bDash },
        { brandSlug: bStripped }
      ];

      // Handle common aliases like H&M <-> hm <-> h-m
      if (/^h(&| and |[-_ ]?)m$/i.test(b) || b.toLowerCase() === 'hm' || b.toLowerCase() === 'h-m' || b.toLowerCase() === 'handm') {
        brandClauses.push(
          { brand: new RegExp('^H&M$', 'i') },
          { brand: new RegExp('^H & M$', 'i') },
          { brand: new RegExp('^HM$', 'i') },
          { brandSlug: 'hm' },
          { brandSlug: 'h-m' },
          { brandSlug: 'handm' }
        );
      }

      andClauses.push({ $or: brandClauses });
    } else if (brandArr.length > 1) {
      const bRegexes = brandArr.flatMap(b => [
        new RegExp(`^${escapeRegex(b)}$`, 'i'),
        new RegExp(`^${escapeRegex(normalizeBrandName(b))}$`, 'i')
      ]);
      const bSlugs = brandArr.flatMap(b => [
        slugify(b),
        String(b).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        String(b).toLowerCase().replace(/[^a-z0-9]+/g, '')
      ]);
      andClauses.push({
        $or: [
          { brand: { $in: bRegexes } },
          { brandSlug: { $in: bSlugs } }
        ]
      });
    }
    if (brandSlug) {
      const slugStr = String(brandSlug).trim().toLowerCase();
      const slugName = slugStr.replace(/-/g, ' ');
      const canonical = normalizeBrandName(slugName);
      const slugClauses = [
        { brandSlug: slugStr },
        { brandSlug: slugify(slugStr) },
        { brand: new RegExp(`^${escapeRegex(slugName)}$`, 'i') },
        { brand: new RegExp(`^${escapeRegex(canonical)}$`, 'i') },
        { brand: new RegExp(escapeRegex(slugStr), 'i') }
      ];
      if (/^h(&| and |[-_ ]?)m$/i.test(slugStr) || slugStr === 'hm' || slugStr === 'h-m' || slugStr === 'handm') {
        slugClauses.push(
          { brand: new RegExp('^H&M$', 'i') },
          { brand: new RegExp('^H & M$', 'i') },
          { brand: new RegExp('^HM$', 'i') },
          { brandSlug: 'hm' },
          { brandSlug: 'h-m' },
          { brandSlug: 'handm' }
        );
      }
      andClauses.push({ $or: slugClauses });
    }

    // Trending filter — for Homepage and Search suggestions
    const { trending } = req.query || {};
    if (trending === 'true' || trending === true || trending === '1') {
      andClauses.push({
        $or: [
          { trending: true },
          { isTrending: true },
          { discountTags: 'trending' },
          { 'ratings.average': { $gte: 4.5 } }
        ]
      });
    }

    if (collection) mongoQuery.collectionName = String(collection);
    if (collectionSlug) mongoQuery.collectionSlug = String(collectionSlug).toLowerCase();
    if (featured === 'true' || featured === true) mongoQuery.featured = true;
    if (minPrice && !Number.isNaN(Number(minPrice))) mongoQuery.price = Object.assign(mongoQuery.price || {}, { $gte: Number(minPrice) });
    if (maxPrice && !Number.isNaN(Number(maxPrice))) mongoQuery.price = Object.assign(mongoQuery.price || {}, { $lte: Number(maxPrice) });
    const tagArr = parseArray(tags);
    if (tagArr.length) mongoQuery.tags = { $in: tagArr };

    // Sizes filter can come as repeated query params or comma separated
    const sizeArr = parseArray(sizes);
    if (sizeArr.length) {
      andClauses.push({ $or: [{ availableSizes: { $in: sizeArr } }, { 'sizes.value': { $in: sizeArr } }, { 'variants.availableSizes': { $in: sizeArr } }] });
    }

    // Colors filter — multi-select, case-insensitive matching across all color fields
    const colorArr = parseArray(colors);
    if (colorArr.length) {
      const colorRegexes = colorArr.map(c => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
      andClauses.push({
        $or: [
          { 'colors.value': { $in: colorRegexes } },
          { 'colors.name': { $in: colorRegexes } },
          { 'variants.name': { $in: colorRegexes } },
          { 'variants.hex': { $in: colorArr.map(c => c.toLowerCase()) } }
        ]
      });
    }

    // Availability — granular status filter (new system)
    const availArr = parseArray(availability);
    if (availArr.length) {
      andClauses.push({ availability: { $in: availArr } });
    } else if (typeof inStock !== 'undefined') {
      // Backwards compatibility: legacy inStock boolean
      if (String(inStock) === 'true' || String(inStock) === '1') mongoQuery.inStock = true;
      else if (String(inStock) === 'false' || String(inStock) === '0') mongoQuery.inStock = false;
    }

    // Age group filter
    const ageGroupArr = parseArray(ageGroup);
    if (ageGroupArr.length) {
      andClauses.push({ ageGroup: { $in: ageGroupArr } });
    }

    // Minimum rating filter
    if (minRating && !Number.isNaN(Number(minRating))) {
      andClauses.push({ 'ratings.average': { $gte: Number(minRating) } });
    }

    // Discount percentage filter — products with at least N% off
    if (discount && !Number.isNaN(Number(discount))) {
      const minDiscPct = Number(discount) / 100;
      andClauses.push({
        originalPrice: { $exists: true, $gt: 0 },
        $expr: {
          $gte: [
            { $divide: [{ $subtract: ['$originalPrice', '$price'] }, '$originalPrice'] },
            minDiscPct
          ]
        }
      });
    }

    // Discount tags filter (sale, clearance, trending, etc.)
    const discountTagArr = parseArray(discountTags);
    if (discountTagArr.length) {
      andClauses.push({ discountTags: { $in: discountTagArr } });
    }

    // Multi-token intelligent search across name, brand, description, category, tags
    const searchVal = search || req.query.q;
    if (searchVal && String(searchVal).trim()) {
      const qStr = String(searchVal).trim();
      const tokens = qStr.split(/\s+/).filter(Boolean);
      tokens.forEach(tok => {
        const safeTok = escapeRegex(tok);
        const tokRegex = new RegExp(safeTok, 'i');
        andClauses.push({
          $or: [
            { name: { $regex: tokRegex } },
            { brand: { $regex: tokRegex } },
            { brandSlug: { $regex: tokRegex } },
            { description: { $regex: tokRegex } },
            { category: { $regex: tokRegex } },
            { categorySlug: { $regex: tokRegex } },
            { subcategory: { $regex: tokRegex } },
            { tags: { $in: [tokRegex] } }
          ]
        });
      });
    }

    // If we collected any $and clauses, combine them with base mongoQuery
    // Support dynamic attribute-based filters passed as query params.
    // Any query param not in the known list will be treated as an attribute filter
    // against the `attributes` map on the Product document.
    const knownParams = new Set([
      'category', 'subcategory', 'brand', 'brandSlug', 'collection', 'collectionSlug', 'featured', 'minPrice', 'maxPrice', 'tags', 'search', 'sort', 'page', 'limit', 'gender', 'sizes', 'colors', 'inStock', 'q',
      'availability', 'ageGroup', 'minRating', 'discount', 'discountTags', 'trending', 'H', 'M'
    ]);

    const attributeAndClauses = [];
    for (const [k, v] of Object.entries(req.query || {})) {
      if (!k) continue;
      if (knownParams.has(k)) continue;
      // skip pagination and internal params
      if (['token', '_'].includes(k)) continue;
      const vals = parseArray(v);
      if (!vals.length) continue;
      // Match attribute values stored in product.attributes.<key>
      const attrKey = `attributes.${k}`;
      attributeAndClauses.push({ [attrKey]: { $in: vals } });
    }

    const allAnds = [].concat(andClauses || [], attributeAndClauses || []);
    const finalQuery = (allAnds.length ? { $and: [mongoQuery, ...allAnds] } : mongoQuery);
    console.log('getAllProducts finalQuery:', JSON.stringify(finalQuery));

    const total = await Product.countDocuments(finalQuery);
    let sortSpec = { createdAt: -1 };
    const sortKey = sort && String(sort).toLowerCase();
    if (sortKey === 'price_asc') sortSpec = { price: 1 };
    else if (sortKey === 'price_desc') sortSpec = { price: -1 };
    else if (sortKey === 'name_asc') sortSpec = { name: 1 };
    else if (sortKey === 'name_desc') sortSpec = { name: -1 };
    else if (sortKey === 'rating') sortSpec = { 'ratings.average': -1 };
    else if (sortKey === 'popularity') sortSpec = { 'ratings.count': -1 };
    else if (sortKey === 'newest') sortSpec = { createdAt: -1 };

    const products = await Product.find(finalQuery)
      .limit(appliedLimit)
      .skip((appliedPage - 1) * appliedLimit)
      .sort(sortSpec)
      .lean();

    const normalized = products.map(p => normalizeProductForClient(p));

    // attach inventory meta
    let lowStockThreshold = 20;
    try {
      const s = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean();
      if (s && s.value != null) lowStockThreshold = Number(s.value);
      else if (process.env.LOW_STOCK_THRESHOLD) {
        const v = Number(process.env.LOW_STOCK_THRESHOLD);
        if (!Number.isNaN(v)) lowStockThreshold = v;
      }
    } catch (e) { }
    normalized.forEach((p) => {
      try {
        p.availableQuantity = computeAvailableQuantity(p);
        p.isOutOfStock = computeIsOutOfStock(p);
        p.isLowStock = computeIsLowStock(p, lowStockThreshold);
      } catch (e) {
        p.availableQuantity = p.availableQuantity || 0;
        p.isOutOfStock = !!p.isOutOfStock;
        p.isLowStock = !!p.isLowStock;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        products: normalized,
        pagination: {
          current: appliedPage,
          pages: Math.ceil(total / appliedLimit),
          total
        }
      }
    });
  } catch (error) {
    console.error('getAllProducts error:', error && (error.stack || error));
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    let product = null;
    // If looks like an ObjectId, try by _id first; otherwise try SEO slug or SKU
    if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
      product = await Product.findById(rawId).populate('relatedProducts', 'name images price seo.slug');
    }
    if (!product) {
      product = await Product.findOne({ $or: [{ 'seo.slug': rawId }, { sku: rawId }] }).populate('relatedProducts', 'name images price seo.slug');
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const out = product.toObject ? product.toObject() : product;

    // optional variant selection
    const variantId = req.query.variantId;
    const colorHex = req.query.colorHex;
    let selectedVariant = null;
    if (variantId && Array.isArray(out.variants)) selectedVariant = out.variants.find(v => String(v._id) === String(variantId));
    if (!selectedVariant && colorHex && Array.isArray(out.variants)) selectedVariant = out.variants.find(v => (v.hex || '').toLowerCase() === String(colorHex).toLowerCase());
    if (!selectedVariant && Array.isArray(out.variants) && out.variants.length) selectedVariant = out.variants[0];
    if (selectedVariant) {
      out.selectedVariant = selectedVariant;
      out.primaryImage = (Array.isArray(selectedVariant.images) && selectedVariant.images.length) ? selectedVariant.images[0].url : '';
    } else {
      const first = Array.isArray(out.images) && out.images.length ? out.images[0] : null;
      out.primaryImage = first ? (typeof first === 'string' ? first : (first && first.url) ? first.url : '') : '';
    }

    try {
      if ((!out.detailSections || !out.detailSections.length) && out.detailTemplate) {
        const t = await DetailTemplate.findById(out.detailTemplate).lean();
        if (t && Array.isArray(t.sections)) out.detailSections = t.sections;
      }
    } catch (e) { console.warn('Failed to resolve detail template for product', e && e.message); }

    try {
      let lowStockThreshold = 20;
      const s = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean().catch(() => null);
      if (s && s.value != null) lowStockThreshold = Number(s.value);
      else if (process.env.LOW_STOCK_THRESHOLD) {
        const v = Number(process.env.LOW_STOCK_THRESHOLD);
        if (!Number.isNaN(v)) lowStockThreshold = v;
      }
      out.availableQuantity = computeAvailableQuantity(out);
      out.isOutOfStock = computeIsOutOfStock(out);
      out.isLowStock = computeIsLowStock(out, lowStockThreshold);
    } catch (e) { out.availableQuantity = out.availableQuantity || 0; out.isOutOfStock = !!out.isOutOfStock; out.isLowStock = !!out.isLowStock; }

    return res.status(200).json({ success: true, data: { product: out } });
  } catch (error) {
    console.error('getProduct error:', error && (error.stack || error));
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category }).sort({ createdAt: -1 }).lean();
    const lowStockSetting = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean().catch(() => null);
    const lowStockThreshold = lowStockSetting && lowStockSetting.value != null ? Number(lowStockSetting.value) : (process.env.LOW_STOCK_THRESHOLD ? Number(process.env.LOW_STOCK_THRESHOLD) : 20);
    const normalized = products.map(p => normalizeProductForClient(p));
    normalized.forEach((p) => {
      try { p.availableQuantity = computeAvailableQuantity(p); p.isOutOfStock = computeIsOutOfStock(p); p.isLowStock = computeIsLowStock(p, lowStockThreshold); } catch (e) { }
    });
    res.status(200).json({ success: true, data: { products: normalized } });
  } catch (error) {
    console.error('getProductsByCategory error:', error && (error.stack || error));
    res.status(500).json({ success: false, message: 'Error fetching products by category' });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(8).sort({ createdAt: -1 }).lean();
    const lowStockSetting = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean().catch(() => null);
    const lowStockThreshold = lowStockSetting && lowStockSetting.value != null ? Number(lowStockSetting.value) : (process.env.LOW_STOCK_THRESHOLD ? Number(process.env.LOW_STOCK_THRESHOLD) : 20);
    const normalized = products.map(p => normalizeProductForClient(p));
    normalized.forEach((p) => {
      try { p.availableQuantity = computeAvailableQuantity(p); p.isOutOfStock = computeIsOutOfStock(p); p.isLowStock = computeIsLowStock(p, lowStockThreshold); } catch (e) { }
    });
    res.status(200).json({ success: true, data: { products: normalized } });
  } catch (error) {
    console.error('getFeaturedProducts error:', error && (error.stack || error));
    res.status(500).json({ success: false, message: 'Error fetching featured products' });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query || {};
    if (!q || !String(q).trim()) return res.status(400).json({ success: false, message: 'Search query is required' });
    
    const tokens = String(q).trim().split(/\s+/).filter(Boolean);
    const andClauses = [];
    tokens.forEach(tok => {
      const safeTok = escapeRegex(tok);
      const tokRegex = new RegExp(safeTok, 'i');
      andClauses.push({
        $or: [
          { name: { $regex: tokRegex } },
          { brand: { $regex: tokRegex } },
          { brandSlug: { $regex: tokRegex } },
          { description: { $regex: tokRegex } },
          { category: { $regex: tokRegex } },
          { categorySlug: { $regex: tokRegex } },
          { subcategory: { $regex: tokRegex } },
          { tags: { $in: [tokRegex] } }
        ]
      });
    });

    const searchQuery = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];
    const products = await Product.find(searchQuery).limit(Math.max(1, Math.min(200, Number(limit) || 10))).lean();
    const lowStockSetting = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean().catch(() => null);
    const lowStockThreshold = lowStockSetting && lowStockSetting.value != null ? Number(lowStockSetting.value) : (process.env.LOW_STOCK_THRESHOLD ? Number(process.env.LOW_STOCK_THRESHOLD) : 20);
    const normalized = products.map(p => normalizeProductForClient(p));
    normalized.forEach((p) => { try { p.availableQuantity = computeAvailableQuantity(p); p.isOutOfStock = computeIsOutOfStock(p); p.isLowStock = computeIsLowStock(p, lowStockThreshold); } catch (e) { } });
    res.status(200).json({ success: true, data: { products: normalized } });
  } catch (error) {
    console.error('searchProducts error:', error && (error.stack || error));
    res.status(500).json({ success: false, message: 'Error searching products' });
  }
};

export const getActiveBrands = async (req, res) => {
  try {
    const rawBrands = await Product.distinct('brand', {
      brand: { $exists: true, $ne: null, $nin: ['', null] }
    }).catch(() => []);

    // Filter, clean, trim, deduplicate (case-insensitive deduplication while preserving nice display casing)
    const brandMap = new Map();
    (rawBrands || []).forEach(b => {
      if (!b) return;
      const trimmed = String(b).trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!brandMap.has(key)) {
        brandMap.set(key, trimmed);
      }
    });

    const sortedBrands = Array.from(brandMap.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return res.status(200).json({
      success: true,
      data: sortedBrands,
      count: sortedBrands.length
    });
  } catch (err) {
    console.error('getActiveBrands error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch active brands' });
  }
};

export const getFilters = async (req, res) => {
  try {
    // Categories from Category collection (hierarchy)
    const categories = await Category.find().sort({ name: 1 }).lean().catch(() => []);

    // Subcategories (product.category values)
    const subcategories = await Product.distinct('category').catch(() => []);

    // Genders/sections
    const genders = await Product.distinct('gender').catch(() => []);

    // Sizes: combine availableSizes, sizes.value and variants.availableSizes
    const sizesA = await Product.distinct('availableSizes').catch(() => []);
    const sizesB = await Product.distinct('sizes.value').catch(() => []);
    const sizesC = await Product.distinct('variants.availableSizes').catch(() => []);
    const sizes = Array.from(new Set([].concat.apply([], [sizesA || [], sizesB || [], sizesC || []]).flat())).filter(Boolean).map(String).sort();

    // Colors: combine colors.value, variants.name and variants.hex
    const colorsA = await Product.distinct('colors.value').catch(() => []);
    const colorsB = await Product.distinct('variants.name').catch(() => []);
    const colorsC = await Product.distinct('variants.hex').catch(() => []);
    const colors = Array.from(new Set([].concat.apply([], [colorsA || [], colorsB || [], colorsC || []]).flat())).filter(Boolean).map(String).sort();

    // Brands & collections
    const brands = await Product.distinct('brand').catch(() => []);
    const collections = await Product.distinct('collection').catch(() => []);

    // Price range
    const priceAgg = await Product.aggregate([{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]).allowDiskUse(true).catch(() => []);
    const priceRange = (priceAgg && priceAgg[0]) ? { min: priceAgg[0].min || 0, max: priceAgg[0].max || 0 } : { min: 0, max: 0 };

    const inStockCount = await Product.countDocuments({ inStock: true }).catch(() => 0);
    const outOfStockCount = await Product.countDocuments({ inStock: false }).catch(() => 0);

    return res.status(200).json({ success: true, data: { categories, subcategories, genders, sizes, colors, brands, collections, priceRange, availability: { inStockCount, outOfStockCount } } });
  } catch (e) {
    console.error('getFilters error', e && (e.stack || e));
    return res.status(500).json({ success: false, message: 'Failed to load product filters' });
  }
};
