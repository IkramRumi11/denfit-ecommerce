import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProductInput, normalizeRelatedProducts } from '../utils/adminProductHelper.js';

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

test('normalizeRelatedProducts correctly parses corrupted backtick nested array strings', async () => {
  const corrupted = "`[ '[\"6a9a4de0003b9cf92496f7a8\"]', '[\"6a9a4de0003b9cf92496f7a8\"]' ]`";
  const result = await normalizeRelatedProducts(corrupted, null);

  assert.deepEqual(result, ['6a9a4de0003b9cf92496f7a8'], 'Should extract and deduplicate clean 24-hex ObjectId');
});

test('normalizeRelatedProducts handles populated product objects', async () => {
  const populated = [
    { _id: '6a9a4de0003b9cf92496f7a8', name: 'Prescott' },
    { id: '6a9a50df003b9cf92496f8b7', name: 'Folio Wallet' }
  ];
  const result = await normalizeRelatedProducts(populated, null);

  assert.deepEqual(result, ['6a9a4de0003b9cf92496f7a8', '6a9a50df003b9cf92496f8b7']);
});

test('normalizeRelatedProducts handles JSON stringified array and comma-separated strings', async () => {
  const jsonArr = '["6a9a4de0003b9cf92496f7a8", "6a9a50df003b9cf92496f8b7"]';
  const res1 = await normalizeRelatedProducts(jsonArr, null);
  assert.deepEqual(res1, ['6a9a4de0003b9cf92496f7a8', '6a9a50df003b9cf92496f8b7']);

  const csv = '6a9a4de0003b9cf92496f7a8, 6a9a50df003b9cf92496f8b7';
  const res2 = await normalizeRelatedProducts(csv, null);
  assert.deepEqual(res2, ['6a9a4de0003b9cf92496f7a8', '6a9a50df003b9cf92496f8b7']);
});

test('normalizeRelatedProducts resolves SKU via mock ProductModel', async () => {
  const mockProductModel = {
    find: (query) => ({
      lean: async () => [
        { _id: '6a9a4de0003b9cf92496f7a8', sku: 'MEN-GEN-104661' }
      ]
    })
  };

  const result = await normalizeRelatedProducts(['MEN-GEN-104661'], mockProductModel);
  assert.deepEqual(result, ['6a9a4de0003b9cf92496f7a8']);
});

test('normalizeProductInput normalizes relatedProducts properly', async () => {
  const payload = {
    name: 'Test',
    category: 'Wallets',
    gender: 'men',
    price: 50,
    relatedProducts: "`[ '[\"6a9a4de0003b9cf92496f7a8\"]' ]`"
  };

  const normalized = await normalizeProductInput(payload, null);
  assert.deepEqual(normalized.relatedProducts, ['6a9a4de0003b9cf92496f7a8']);
});
