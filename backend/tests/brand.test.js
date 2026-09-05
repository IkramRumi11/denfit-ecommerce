import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeBrandName, slugifyBrand, getCuratedBrands } from '../utils/brandHelper.js';
import { normalizeProductInput } from '../utils/adminProductHelper.js';

test('normalizeBrandName canonicalizes curated global & Pakistani brands', () => {
  assert.equal(normalizeBrandName('denfit'), 'DENFiT');
  assert.equal(normalizeBrandName('DENFIT'), 'DENFiT');
  assert.equal(normalizeBrandName('den fit'), 'DENFiT');
  assert.equal(normalizeBrandName('nike'), 'Nike');
  assert.equal(normalizeBrandName('NIKE'), 'Nike');
  assert.equal(normalizeBrandName('adidas'), 'Adidas');
  assert.equal(normalizeBrandName('levis'), "Levi's");
  assert.equal(normalizeBrandName("levi's"), "Levi's");
  assert.equal(normalizeBrandName('hm'), 'H&M');
  assert.equal(normalizeBrandName('h&m'), 'H&M');
  assert.equal(normalizeBrandName('outfitters'), 'Outfitters');
  assert.equal(normalizeBrandName('gul ahmed'), 'Gul Ahmed');
  assert.equal(normalizeBrandName('gulahmed'), 'Gul Ahmed');
  assert.equal(normalizeBrandName('junaid jamshed'), 'J.');
  assert.equal(normalizeBrandName('j.'), 'J.');
  assert.equal(normalizeBrandName('bonanza'), 'Bonanza Satrangi');
  assert.equal(normalizeBrandName('under armour'), 'Under Armour');
});

test('normalizeBrandName gracefully handles custom manual brands', () => {
  assert.equal(normalizeBrandName('my custom brand'), 'My Custom Brand');
  assert.equal(normalizeBrandName('Acme Studio'), 'Acme Studio');
  assert.equal(normalizeBrandName(''), '');
  assert.equal(normalizeBrandName(null), '');
  assert.equal(normalizeBrandName(undefined), '');
});

test('slugifyBrand creates clean URL slug for brands', () => {
  assert.equal(slugifyBrand('DENFiT'), 'denfit');
  assert.equal(slugifyBrand("Levi's"), 'levis');
  assert.equal(slugifyBrand('H&M'), 'handm');
  assert.equal(slugifyBrand('Gul Ahmed'), 'gul-ahmed');
  assert.equal(slugifyBrand('Under Armour'), 'under-armour');
  assert.equal(slugifyBrand(''), '');
});

test('getCuratedBrands returns list with House Brand DENFiT and others', () => {
  const brands = getCuratedBrands();
  assert.ok(Array.isArray(brands) && brands.length > 20);
  const denfit = brands.find(b => b.name === 'DENFiT');
  assert.ok(denfit, 'DENFiT should be present');
  assert.equal(denfit.category, 'House Brand');
});

test('normalizeProductInput normalizes brand and produces brandSlug', async () => {
  const payload = {
    name: 'DENFiT Premium Hoodie',
    category: 'Hoodies',
    gender: 'unisex',
    price: 3500,
    brand: 'denfit'
  };

  const normalized = await normalizeProductInput(payload, null);
  assert.equal(normalized.brand, 'DENFiT');
  assert.equal(normalized.brandSlug, 'denfit');
});
