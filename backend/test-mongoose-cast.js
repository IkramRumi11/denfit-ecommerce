// backend/test-mongoose-cast.js
import mongoose from 'mongoose';
import Product from './models/Product.js';
import { normalizeAttributesInput } from './utils/attributes.js';

const run = () => {
  const rawAttributes = '{"clothing-size":["S","M","L","XL"],"fabric":["Cotton","Polyester","Linen"],"occasion":["Casual"],"color":["Black"]}';
  
  console.log('--- Case 1: Passing the string directly to Product model ---');
  try {
    const p1 = new Product({
      name: 'Test',
      description: 'Test',
      price: 100,
      category: 'men',
      inventory: 10,
      images: [{ url: 'http://example.com/img.jpg' }],
      attributes: rawAttributes
    });
    const err = p1.validateSync();
    if (err) {
      console.log('Validation failed (expected):', err.message);
    } else {
      console.log('Validation passed');
    }
  } catch (err) {
    console.log('Caught exception (expected):', err.message || err);
  }

  console.log('--- Case 2: Passing the normalized attributes to Product model ---');
  try {
    const normalized = normalizeAttributesInput(rawAttributes);
    console.log('Normalized attributes:', JSON.stringify(normalized));
    const p2 = new Product({
      name: 'Test',
      description: 'Test',
      price: 100,
      category: 'men',
      inventory: 10,
      images: [{ url: 'http://example.com/img.jpg' }],
      attributes: normalized
    });
    const err = p2.validateSync();
    if (err) {
      console.log('Validation failed:', err.message);
    } else {
      console.log('Validation passed!');
      console.log('Product attributes Map:', p2.attributes);
    }
  } catch (err) {
    console.log('Caught exception:', err.message || err);
  }
};

run();
process.exit(0);
