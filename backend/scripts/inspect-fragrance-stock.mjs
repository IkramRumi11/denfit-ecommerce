import mongoose from 'mongoose';
import Product from '../models/Product.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/denfit-ecommerce?replicaSet=rs0';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const frags = await Product.find({ category: 'fragrances' }).select('name sizes inventory inStock').lean();
  console.log('Total fragrances found:', frags.length);
  for (const f of frags) {
    console.log(`Product: ${f.name} (ID: ${f._id})`);
    console.log(`  Total Inventory: ${f.inventory}, inStock: ${f.inStock}`);
    console.log('  Sizes / Volumes:', f.sizes);
  }

  // Let's create or update a designated test product if desired
  let testFrag = await Product.findOne({ name: 'Vetiver Imperial Test' });
  if (!testFrag) {
    testFrag = await Product.create({
      name: 'Vetiver Imperial Test',
      description: 'A luxurious test fragrance for isolated variant stock verification.',
      price: 145,
      category: 'fragrances',
      categorySlug: 'fragrances',
      images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
      inventory: 11,
      inStock: true,
      sizes: [
        { id: 'size_30', value: '30 ml', quantity: 1, inStock: true, price: 95 },
        { id: 'size_50', value: '50 ml', quantity: 10, inStock: true, price: 145 }
      ]
    });
    console.log('Created test fragrance product:', testFrag._id);
  } else {
    testFrag.sizes = [
      { id: 'size_30', value: '30 ml', quantity: 1, inStock: true, price: 95 },
      { id: 'size_50', value: '50 ml', quantity: 10, inStock: true, price: 145 }
    ];
    testFrag.inventory = 11;
    testFrag.inStock = true;
    await testFrag.save();
    console.log('Reset test fragrance product stock: 30ml=1, 50ml=10 (ID: ' + testFrag._id + ')');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
