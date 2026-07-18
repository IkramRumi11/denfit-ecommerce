const fs = require('fs');
const path = require('path');

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function productDiscount(prod) {
  if (typeof prod.discountPercentage === 'number') return Number(prod.discountPercentage) || 0;
  const orig = prod.originalPrice || prod.compareAtPrice || prod.original_price;
  const p = prod.price || 0;
  if (orig && Number(orig) > Number(p)) {
    const pct = Math.round(((Number(orig) - Number(p)) / Number(orig)) * 100);
    return Number.isFinite(pct) ? pct : 0;
  }
  return 0;
}

function loadProducts() {
  const p = path.join(__dirname, '..', 'frontend', 'tmp', 'products.json');
  const raw = fs.readFileSync(p, 'utf8');
  try {
    const obj = JSON.parse(raw);
    return obj.data && obj.data.products ? obj.data.products : (obj.products || []);
  } catch (e) {
    console.error('Failed to parse products.json', e);
    return [];
  }
}

const products = loadProducts();
console.log('Loaded', products.length, 'products');

// Simulate "Accessories up to 30% off"
const decodedLower = 'accessories up to 30% off';
const threshMatch = decodedLower.match(/(\d{1,3})\s*%?/);
const threshold = threshMatch ? parseInt(threshMatch[1], 10) : null;
const isUpTo = /up[- ]?to|upto/.test(decodedLower);

// build expanded accessory list from megaMenuData
const menuPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'megaMenuData.ts');
let accessoryItems = ['accessories'];
try {
  const menuSrc = fs.readFileSync(menuPath, 'utf8');
  const match = menuSrc.match(/accessories:\s*\{([\s\S]*?)\}\s*,/m);
  if (match) {
    const block = match[1];
    const items = Array.from(block.matchAll(/'([^']+)'/g)).map(m=>m[1]);
    items.forEach(i=>accessoryItems.push(slugify(i)));
  }
} catch (e) {
  // ignore
}
accessoryItems = Array.from(new Set(accessoryItems.map(s=>String(s).toLowerCase())));

console.log('Accessory targets:', accessoryItems.slice(0,20));

function matchesCategory(prod) {
  const candidates = [prod.category, prod.subcategory, prod.subCategory, prod.type, prod.section];
  if (Array.isArray(prod.tags)) candidates.push(...prod.tags);
  if (Array.isArray(prod.colors)) candidates.push(...prod.colors);
  for (const c of candidates.filter(Boolean)) {
    if (Array.isArray(c)) {
      if (c.map(String).some(x => accessoryItems.includes(slugify(x)))) return true;
    }
    try { if (accessoryItems.includes(slugify(c))) return true; } catch(e){}
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.map(String).some(x => accessoryItems.includes(slugify(x)))) return true;
      } catch(e){}
    }
  }
  if (accessoryItems.includes(slugify(prod.name || ''))) return true;
  return false;
}

const matches = products.filter(p => {
  if (!matchesCategory(p)) return false;
  const disc = productDiscount(p);
  if (threshold !== null) {
    if (isUpTo) {
      if (!(disc > 0 && disc <= threshold)) return false;
    } else {
      if (disc < threshold) return false;
    }
  }
  return true;
});

console.log('Matches count:', matches.length);
matches.slice(0,50).forEach(m => {
  console.log('-', m.id || m._id, m.name, 'category=', m.category, 'discount=', productDiscount(m));
});
