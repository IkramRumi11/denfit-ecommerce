import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config({ path: '../../.env' });

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit';

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB', MONGO);

  const cursor = Product.find({ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] }).cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      const p = doc.toObject ? doc.toObject() : doc;
      const images = Array.isArray(p.images) ? p.images.map(i => (typeof i === 'string' ? { url: i } : i)) : [];
      const firstColor = Array.isArray(p.colors) && p.colors.length ? p.colors[0] : null;
      const sizesFromDoc = Array.isArray(p.sizes) && p.sizes.length ? (typeof p.sizes[0] === 'string' ? p.sizes : p.sizes.map(s => s && s.value ? s.value : '')) : [];
      const variant = {
        name: firstColor?.name || 'Default',
        hex: firstColor?.hex || undefined,
        images,
        availableSizes: p.availableSizes || sizesFromDoc || [],
        inventory: p.inventory || 0
      };

      // Save variant into product
      doc.variants = [variant];
      await doc.save();
      count++;
      console.log(`Migrated product ${p._id} -> variants created (${images.length} images)`);
    } catch (e) {
      console.error('Failed to migrate product', doc._id, e);
    }
  }

  console.log('Migration complete. Products updated:', count);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
