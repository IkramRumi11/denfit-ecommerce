// backend/scratch/verify-mark-modified.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/denfit-ecommerce';

async function run() {
  process.env.USE_STOCK_AS_SOURCE_OF_TRUTH = 'true';
  await mongoose.connect(MONGODB_URI);
  await Product.deleteMany({ sku: 'TEST-MARK-MODIFIED' });

  // Create test product
  const p = await Product.create({
    name: 'Mongoose Test',
    description: 'Testing nested array mutation persistence',
    price: 100,
    category: 'clothing',
    sku: 'TEST-MARK-MODIFIED',
    images: [{ url: 'https://via.placeholder.com/150' }],
    sizes: [{ id: 'size_s', value: 'S', quantity: 2, inStock: true }],
    variants: [{ name: 'Red', hex: '#ff0000', inventory: 2, images: [{ url: 'https://via.placeholder.com/150' }] }],
    stock: [{ colorTempId: 'Red', sizeId: 'size_s', quantity: 2 }],
    inventory: 2,
    inStock: true
  });

  console.log('Initially created in database:');
  console.log(' - Variants inventory:', p.variants[0].inventory);
  console.log(' - Sizes quantity:', p.sizes[0].quantity);

  // Scenario A: Mutate stock array directly and save without markModified
  console.log('\n--- Scenario A: Mutate and save WITHOUT markModified ---');
  p.stock[0].quantity = 1;
  p.deriveInventory(); // Recalculates inventory, sizes, and variants in memory

  console.log('Before save (in-memory):');
  console.log(' - Variants inventory:', p.variants[0].inventory); // should be 1
  console.log(' - Sizes quantity:', p.sizes[0].quantity);         // should be 1

  await p.save();

  const reloadedA = await Product.findById(p._id);
  console.log('After save (reloaded from DB):');
  console.log(' - Variants inventory:', reloadedA.variants[0].inventory); // Does it persist 1 or stay 2?
  console.log(' - Sizes quantity:', reloadedA.sizes[0].quantity);         // Does it persist 1 or stay 2?

  // Scenario B: Mutate and save WITH markModified
  console.log('\n--- Scenario B: Mutate and save WITH markModified ---');
  reloadedA.stock[0].quantity = 0;
  reloadedA.deriveInventory();

  // Force markModified
  reloadedA.markModified('variants');
  reloadedA.markModified('sizes');

  console.log('Before save (in-memory):');
  console.log(' - Variants inventory:', reloadedA.variants[0].inventory); // should be 0
  console.log(' - Sizes quantity:', reloadedA.sizes[0].quantity);         // should be 0

  await reloadedA.save();

  const reloadedB = await Product.findById(p._id);
  console.log('After save (reloaded from DB):');
  console.log(' - Variants inventory:', reloadedB.variants[0].inventory); // Did it persist 0?
  console.log(' - Sizes quantity:', reloadedB.sizes[0].quantity);         // Did it persist 0?

  // Clean up
  await Product.findByIdAndDelete(p._id);
  await mongoose.disconnect();
}

run().catch(console.error);
