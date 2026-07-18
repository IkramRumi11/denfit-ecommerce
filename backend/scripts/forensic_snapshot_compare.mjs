#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Ensure we load backend .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

const SNAP = path.resolve(process.cwd(), 'tmp', 'verify-products.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'backend', 'uploads');
const OUT_PATH = path.resolve(process.cwd(), 'tmp', 'forensic_report.json');

const readSnapshot = () => {
  if (!fs.existsSync(SNAP)) {
    console.error(JSON.stringify({ success: false, error: 'snapshot_not_found', path: SNAP }));
    process.exit(1);
  }
  const raw = fs.readFileSync(SNAP, 'utf8');
  try { return JSON.parse(raw); } catch (e) { console.error(JSON.stringify({ success: false, error: 'invalid_json', message: String(e) })); process.exit(2); }
};

const findProductsArray = (obj) => {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== 'object') return null;
  if (obj.products && Array.isArray(obj.products)) return obj.products;
  if (obj.data && Array.isArray(obj.data)) return obj.data;
  // recursive search
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (Array.isArray(v) && v.length && (v[0]._id || v[0].id || v[0].sku || v[0].name)) return v;
    if (typeof v === 'object') {
      const r = findProductsArray(v);
      if (r) return r;
    }
  }
  return null;
};

const extractId = (p) => {
  if (!p) return null;
  const cand = p._id || p.id || (p._doc && p._doc._id) || (p._id && p._id.$oid) || (p._id && p._id['$oid']);
  if (!cand) return null;
  if (typeof cand === 'string') return cand;
  if (typeof cand === 'object' && (cand.$oid || cand['$oid'])) return cand.$oid || cand['$oid'];
  return String(cand);
};

const extractImages = (p) => {
  const imgs = [];
  if (!p) return imgs;
  if (Array.isArray(p.images)) {
    for (const it of p.images) {
      if (!it) continue;
      if (typeof it === 'string') imgs.push(it);
      else if (it.url) imgs.push(it.url);
      else if (it.path) imgs.push(it.path);
      else if (it.src) imgs.push(it.src);
    }
  } else if (p.image) {
    if (typeof p.image === 'string') imgs.push(p.image);
    else if (p.image.url) imgs.push(p.image.url);
  } else if (p.imagesUrls && Array.isArray(p.imagesUrls)) {
    imgs.push(...p.imagesUrls.map(x => typeof x === 'string' ? x : (x.url||x)));
  }
  return imgs.map(u => u && typeof u === 'string' ? u.split('?')[0] : u).filter(Boolean);
};

const walkUploads = (dir) => {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  return files;
};

(async () => {
  try {
    const snapObj = readSnapshot();
    const products = findProductsArray(snapObj);
    if (!products) {
      console.error(JSON.stringify({ success: false, error: 'products_array_not_found' }));
      process.exit(3);
    }

    // Normalize product entries
    const normalized = products.map(p => {
      const id = extractId(p);
      const name = p.name || p.title || (p._doc && p._doc.name) || '';
      const slug = (p.seo && p.seo.slug) || p.slug || '';
      const category = p.category || p.subcategory || (p._doc && p._doc.category) || '';
      const price = (p.price ?? (p.pricing && p.pricing.price) ?? (p._doc && p._doc.price) ?? null);
      const images = extractImages(p);
      return { raw: p, id, name, slug, category, price, images, imageCount: images.length };
    });

    // Connect DB (read-only operations only)
    await connectDB();

    const presentIds = [];
    const missingIds = [];
    const invalidIds = [];

    for (const item of normalized) {
      const id = item.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) { invalidIds.push(id); continue; }
      // Use exists for minimal load
      const found = await Product.exists({ _id: id }).catch(() => null);
      if (found) presentIds.push(id); else missingIds.push(id);
    }

    // Categories check
    const categories = Array.from(new Set(normalized.map(p => p.category).filter(Boolean)));
    const categoryResults = [];
    for (const c of categories) {
      const q = { $or: [{ slug: c }, { name: c }, { title: c }] };
      const found = await Category.findOne(q).lean().catch(() => null);
      categoryResults.push({ category: c, exists: !!found, found: found ? { _id: found._id, name: found.name, slug: found.slug } : null });
    }

    // Orders referencing snapshot products
    const snapshotIdsValid = normalized.map(p => p.id).filter(id => id && mongoose.Types.ObjectId.isValid(id));
    let orders = [];
    if (snapshotIdsValid.length) {
      orders = await Order.find({ 'items.product': { $in: snapshotIdsValid } }).select('orderNumber items customer createdAt').lean().catch(() => []);
    }

    // Uploads - local files
    const uploadFiles = walkUploads(UPLOADS_DIR);
    const uploadBasenames = new Set(uploadFiles.map(f => path.basename(f).toLowerCase()));

    const imageChecks = [];
    let totalImages = 0;
    let cloudinaryCount = 0;
    for (const p of normalized) {
      for (const url of p.images) {
        totalImages++;
        let isCloudinary = false;
        try {
          const l = url.toLowerCase();
          if (l.includes('cloudinary') || l.includes('res.cloudinary.com')) isCloudinary = true;
        } catch (e) {}
        if (isCloudinary) cloudinaryCount++;
        const base = path.basename(url.split('?')[0] || '').toLowerCase();
        const localExists = base && uploadBasenames.has(base);
        imageChecks.push({ productId: p.id, url, base, localExists, cloudinary: isCloudinary });
      }
    }

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      snapshotPath: SNAP,
      snapshotCount: normalized.length,
      products: normalized.map(p => ({ id: p.id, name: p.name, slug: p.slug, category: p.category, price: p.price, imageCount: p.imageCount })),
      dbPresence: { presentIds, missingIds, invalidIds },
      categories: categoryResults,
      ordersReferencingSnapshotProducts: { count: orders.length, orders: orders.map(o => ({ _id: o._id, orderNumber: o.orderNumber, createdAt: o.createdAt, items: o.items.filter(it => snapshotIdsValid.includes(String(it.product))).map(it=>({ product: String(it.product), name: it.name, quantity: it.quantity, price: it.price })) })) },
      images: { totalImages, cloudinaryCount, imageChecks },
    };

    // Write forensic report for convenience (local file only)
    try { fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true }); fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), 'utf8'); } catch (e) { /* ignore */ }

    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err), stack: err?.stack }, null, 2));
    process.exit(2);
  }
})();
