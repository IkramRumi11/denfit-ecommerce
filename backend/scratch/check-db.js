import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: Product } = await import('../models/Product.js');
  const products = await Product.find({}).lean();
  console.log('Products in DB:', products.map(p => ({ id: p._id, name: p.name, inventory: p.inventory })));

  process.exit(0);
} catch (err) {
  console.error('Check failed:', err);
  process.exit(1);
}