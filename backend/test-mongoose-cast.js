// backend/test-mongoose-cast.js
import mongoose from 'mongoose';

import Product from './models/Product.js';
import { normalizeAttributesInput } from './utils/attributes.js';
import { normalizeProductInput } from './utils/adminProductHelper.js';

const run = async () => {
  const rawAttributes = '{"clothing-size":["S","M","L","XL"],"fabric":["Cotton","Polyester","Linen"],"occasion":["Casual"],"color":["Black"]}';
  
  console.log('--- Case 1: String image directly on Product model ---');
  try {
    const p1 = new Product({
      name: 'Test',
      description: 'Test',
      price: 100,
      category: 'men',
      inventory: 10,
      images: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQI1hg5dQb7yNRFm63KUsMcxZP08NPD9x8eqRksLBHHmw&s=10",
      attributes: normalizeAttributesInput(rawAttributes)
    });
    const err = p1.validateSync();
    if (err) {
      console.log('Validation failed:', err.message);
    } else {
      console.log('Validation passed for string image! Images length:', p1.images.length, p1.images[0]);
    }
  } catch (err) {
    console.log('Caught exception:', err.message || err);
  }

  console.log('--- Case 2: Array of string URLs directly on Product model ---');
  try {
    const p2 = new Product({
      name: 'Test',
      description: 'Test',
      price: 100,
      category: 'men',
      inventory: 10,
      images: [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      attributes: normalizeAttributesInput(rawAttributes)
    });
    const err = p2.validateSync();
    if (err) {
      console.log('Validation failed:', err.message);
    } else {
      console.log('Validation passed for array of string URLs! Images length:', p2.images.length, p2.images);
    }
  } catch (err) {
    console.log('Caught exception:', err.message || err);
  }

  console.log('--- Case 3: normalizeProductInput with string URL ---');
  try {
    const input = {
      name: 'Test',
      description: 'Test',
      price: 100,
      category: 'men',
      inventory: '10',
      images: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQI1hg5dQb7yNRFm63KUsMcxZP08NPD9x8eqRksLBHHmw&s=10"
    };
    const norm = await normalizeProductInput(input, Product);
    const p3 = new Product(norm);
    const err = p3.validateSync();
    if (err) {
      console.log('Validation failed:', err.message);
    } else {
      console.log('Validation passed for normalized product input!', norm.images);
    }
  } catch (err) {
    console.log('Caught exception:', err.message || err);
  }
};

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
