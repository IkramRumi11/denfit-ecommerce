import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Ensure cwd is backend (so imports resolve); use start from repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.join(__dirname, '..'));

import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';

const PLACEHOLDER = process.env.PLACEHOLDER_IMAGE || 'https://via.placeholder.com/800x800?text=Image+Placeholder';

const ensureFourImages = async () => {
  try {
    await connectDB();

    // Find products where images array size < 4
    const products = await Product.find({
      $expr: { $lt: [{ $size: { $ifNull: ['$images', []] } }, 4] }
    });

    console.log(`Found ${products.length} products with fewer than 4 images.`);

    let updated = 0;
    for (const p of products) {
      const imgs = Array.isArray(p.images) ? [...p.images] : [];

      if (imgs.length === 0) {
        for (let i = 0; i < 4; i++) {
          imgs.push({ url: PLACEHOLDER, filename: 'placeholder', publicId: null, isPrimary: i === 0, order: i });
        }
      } else {
        // Ensure first image marked primary
        imgs[0].isPrimary = true;
        imgs.forEach((img, idx) => { img.order = idx; });
        // Duplicate last image or use placeholder until length 4
        while (imgs.length < 4) {
          const last = imgs[imgs.length - 1];
          if (last && last.url) {
            imgs.push({ url: last.url, filename: last.filename || 'dup', publicId: last.publicId || null, isPrimary: false, order: imgs.length });
          } else {
            imgs.push({ url: PLACEHOLDER, filename: 'placeholder', publicId: null, isPrimary: false, order: imgs.length });
          }
        }
      }

      p.images = imgs;
      try {
        await p.save();
        updated++;
        console.log(`Updated product ${p._id}: images -> ${p.images.length}`);
      } catch (err) {
        console.error(`Failed to update product ${p._id}:`, err && err.message ? err.message : err);
      }
    }

    console.log(`Migration complete. Updated ${updated} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
};

ensureFourImages();
