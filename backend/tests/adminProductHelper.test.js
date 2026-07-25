import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductInput } from '../utils/adminProductHelper.js';

test('normalizeProductInput preserves product gender and category', async () => {
  const input = {
    name: 'Test Product',
    category: 'Shoes',
    gender: 'men',
    price: 120,
    brand: 'Denfit'
  };

  const normalized = await normalizeProductInput(input, null);

  assert.equal(normalized.category, 'Shoes', 'Category should remain unchanged');
  assert.equal(normalized.gender, 'men', 'Gender should remain "men" and not be overwritten by category');
  assert.equal(normalized.categorySlug, 'shoes', 'Category slug should be generated correctly');
  assert.equal(normalized.brandSlug, 'denfit', 'Brand slug should be generated correctly');
});

test('normalizeProductInput update path preserves gender and does not overwrite with category', async () => {
  const existingProductPayload = {
    name: 'Existing Product',
    category: 'Apparel',
    gender: 'women',
    price: 80,
    brand: 'Denfit'
  };

  const normalized = await normalizeProductInput(existingProductPayload, null);

  assert.equal(normalized.category, 'Apparel', 'Category should remain unchanged');
  assert.equal(normalized.gender, 'women', 'Gender should remain "women" and not be overwritten by category "Apparel"');
  assert.equal(normalized.categorySlug, 'apparel', 'Category slug should be generated correctly');
});
