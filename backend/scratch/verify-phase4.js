// backend/scratch/verify-phase4.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { normalizeProductInput, mapFilesToVariants, slugify, generateSKU } from '../utils/adminProductHelper.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Test Case 1: Slugify & generateSKU
  console.log('\n--- Test Case 1: Slugify & generateSKU ---');
  const slug = slugify('Men & Women Clothing!');
  console.log(`- Slugified: "${slug}"`);
  if (slug === 'men-and-women-clothing') console.log('PASS: slugify');
  else console.error(`FAIL: slugify (Expected "men-and-women-clothing", got "${slug}")`);

  const sku = generateSKU('Men', 'Nike');
  console.log(`- Generated SKU: "${sku}"`);
  if (/^MEN-NIK-\d{6}$/.test(sku)) console.log('PASS: generateSKU');
  else console.error('FAIL: generateSKU format mismatch');

  // Test Case 2: normalizeProductInput
  console.log('\n--- Test Case 2: normalizeProductInput ---');
  const mockBody = {
    name: 'Test Product',
    category: 'men',
    subcategory: 'Shirts',
    inventory: ' 45 ',
    images: '["http://example.com/img.jpg"]',
    sizes: '["S", {"id":"size_m","value":"M","quantity":10}]',
    tags: '["active", "summer", "summer"]',
    stock: '[{"color":"Red","size":"S","quantity":"5"}]',
    specifications: '{"material":"Cotton"}',
    seo: '{"title":"Test Product SEO"}',
  };

  const normalized = await normalizeProductInput(mockBody, Product);
  console.log('Normalized fields:');
  console.log(`- inventory: ${normalized.inventory} (typeof: ${typeof normalized.inventory})`);
  console.log(`- images: ${JSON.stringify(normalized.images)}`);
  console.log(`- sizes: ${JSON.stringify(normalized.sizes)}`);
  console.log(`- tags: ${JSON.stringify(normalized.tags)}`);
  console.log(`- stock: ${JSON.stringify(normalized.stock)}`);
  console.log(`- categorySlug: "${normalized.categorySlug}"`);

  if (
    normalized.inventory === 45 &&
    normalized.images[0].url === 'http://example.com/img.jpg' &&
    normalized.sizes[0].value === 'S' &&
    normalized.sizes[1].quantity === 10 &&
    normalized.tags.length === 2 && // deduplicated
    normalized.stock[0].colorTempId === 'Red' &&
    normalized.categorySlug === 'men'
  ) {
    console.log('PASS: normalizeProductInput');
  } else {
    console.error('FAIL: normalizeProductInput properties mismatch');
  }

  // Test Case 3: mapFilesToVariants
  console.log('\n--- Test Case 3: mapFilesToVariants ---');
  const mockFiles = [
    { fieldname: 'variantImages_red_0', filename: 'red_img_0.jpg' },
    { fieldname: 'variantSwatch_red', filename: 'red_swatch.jpg' },
    { fieldname: 'variantImages_blue_0', filename: 'blue_img_0.jpg' }
  ];
  const parsedVariants = [
    { tempId: 'red', name: 'Red', hex: '#ff0000', images: [], swatchImage: '' },
    { tempId: 'blue', name: 'Blue', hex: '#0000ff', images: [], swatchImage: '' }
  ];

  const mapped = mapFilesToVariants(mockFiles, parsedVariants, 'http://localhost:5001');
  console.log('Mapped variants result:');
  console.log(JSON.stringify(mapped, null, 2));

  if (
    mapped[0].images[0].url === 'http://localhost:5001/uploads/red_img_0.jpg' &&
    mapped[0].swatchImage.url === 'http://localhost:5001/uploads/red_swatch.jpg' &&
    mapped[1].images[0].url === 'http://localhost:5001/uploads/blue_img_0.jpg'
  ) {
    console.log('PASS: mapFilesToVariants');
  } else {
    console.error('FAIL: mapFilesToVariants mapping mismatch');
  }

  await mongoose.disconnect();
  console.log('\nAll done!');
}

run().catch(err => {
  console.error('Failed to run verification:', err);
  process.exit(1);
});
