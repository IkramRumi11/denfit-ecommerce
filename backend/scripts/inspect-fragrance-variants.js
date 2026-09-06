import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Product from './models/Product.js';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/denfit';
    await mongoose.connect(mongoUri);

    const prods = await Product.find({
      $or: [
        { category: /fragrance/i },
        { gender: 'fragrances' },
        { subcategory: /fragrance/i }
      ]
    }).limit(4).lean();

    console.log('--- FOUND FRAGRANCES: ' + prods.length + ' ---');
    for (const p of prods) {
      console.log('ID:', p._id);
      console.log('Name:', p.name);
      console.log('Base Price:', p.price);
      console.log('Sizes:', JSON.stringify(p.sizes));
      console.log('Variants:', JSON.stringify(p.variants));
      console.log('Stock:', JSON.stringify(p.stock));
      console.log('AvailableSizes:', JSON.stringify(p.availableSizes));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
