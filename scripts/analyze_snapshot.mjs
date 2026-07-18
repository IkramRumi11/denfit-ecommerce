#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const SNAP = path.resolve(process.cwd(), 'tmp', 'verify-products.json');
if (!fs.existsSync(SNAP)) {
  console.error(JSON.stringify({ success: false, error: 'snapshot_not_found', path: SNAP }));
  process.exit(1);
}

const raw = fs.readFileSync(SNAP, 'utf8');
let obj;
try {
  obj = JSON.parse(raw);
} catch (e) {
  console.error(JSON.stringify({ success: false, error: 'invalid_json', message: String(e) }));
  process.exit(2);
}

// Try to find products array in common places
let products = null;
if (obj && Array.isArray(obj)) products = obj;
else if (obj.list && obj.list.body && obj.list.body.data && Array.isArray(obj.list.body.data.products)) products = obj.list.body.data.products;
else if (obj.data && Array.isArray(obj.data.products)) products = obj.data.products;
else if (obj.products && Array.isArray(obj.products)) products = obj.products;
else {
  // Search recursively for first array that looks like products
  const findProducts = (o) => {
    if (!o || typeof o !== 'object') return null;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (Array.isArray(v) && v.length && v[0] && (v[0]._id || v[0].sku || v[0].name)) return v;
      if (typeof v === 'object') {
        const r = findProducts(v);
        if (r) return r;
      }
    }
    return null;
  };
  products = findProducts(obj);
}

if (!products) {
  console.error(JSON.stringify({ success: false, error: 'products_array_not_found' }));
  process.exit(3);
}

const total = products.length;
const idCounts = new Map();
const slugCounts = new Map();
const catCounts = new Map();
let totalImages = 0;
let productsWithNoImages = 0;
let missingIdCount = 0;
const duplicates = [];

products.forEach(p => {
  const id = p._id || p.id || (p._doc && p._doc._id) || null;
  if (!id) missingIdCount++;
  else idCounts.set(id, (idCounts.get(id) || 0) + 1);
  const slug = (p.seo && p.seo.slug) || p.slug || '';
  if (slug) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  const cat = p.category || p.subcategory || 'unknown';
  catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
  const imgs = Array.isArray(p.images) ? p.images : [];
  const imgCount = imgs.length;
  totalImages += imgCount;
  if (imgCount === 0) productsWithNoImages++;
});

for (const [id, c] of idCounts.entries()) if (c > 1) duplicates.push({ id, count: c });
const dupSlugs = [];
for (const [s, c] of slugCounts.entries()) if (c > 1) dupSlugs.push({ slug: s, count: c });

const categoryCounts = {};
for (const [k, v] of catCounts.entries()) categoryCounts[k] = v;

const stats = {
  success: true,
  snapshotPath: SNAP,
  totalProductsInSnapshot: total,
  missingIdsInSnapshot: missingIdCount,
  duplicateProductIds: duplicates,
  duplicateSlugs: dupSlugs,
  categoryCounts,
  totalImages,
  productsWithNoImages,
};

console.log(JSON.stringify(stats, null, 2));

process.exit(0);
