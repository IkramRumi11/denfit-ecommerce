import assert from 'assert';
import { getVariantPrice, getVariantOriginalPrice, hasVariantPricing, getMinProductPrice } from '../utils/variantPriceHelper.js';

console.log('--- Running Universal Variant Price Helper Tests ---');

// Test 1: Fragrance with distinct volume variant prices
const fragranceProduct = {
  _id: 'prod_frag_1',
  name: 'Vetiver Imperial',
  price: 145, // base price (50ml default)
  originalPrice: 165,
  category: 'fragrances',
  sizes: [
    { id: 'vol_50', value: '50 ml', quantity: 40, price: 145, originalPrice: 165 },
    { id: 'vol_100', value: '100 ml', quantity: 25, price: 240, originalPrice: 280 },
    { id: 'vol_200', value: '200 ml', quantity: 15, price: 390, originalPrice: 450 }
  ]
};

assert.strictEqual(getVariantPrice(fragranceProduct, { size: '50 ml' }), 145, '50ml price should be 145');
assert.strictEqual(getVariantPrice(fragranceProduct, { size: '100 ml' }), 240, '100ml price should be 240');
assert.strictEqual(getVariantPrice(fragranceProduct, { size: '200 ml' }), 390, '200ml price should be 390');
assert.strictEqual(getVariantOriginalPrice(fragranceProduct, { size: '100 ml' }), 280, '100ml original price should be 280');
assert.strictEqual(getVariantOriginalPrice(fragranceProduct, { size: '200 ml' }), 450, '200ml original price should be 450');
assert.strictEqual(hasVariantPricing(fragranceProduct), true, 'Fragrance product should be recognized as having variant pricing');
assert.strictEqual(getMinProductPrice(fragranceProduct), 145, 'Min price should be 145');
console.log('✓ Test 1 Passed: Fragrance volume variants resolve correct prices');

// Test 2: Standard single-price apparel (no variant pricing)
const standardApparel = {
  _id: 'prod_tee_1',
  name: 'Classic Denfit Tee',
  price: 55,
  originalPrice: 70,
  category: 'men',
  sizes: [
    { id: 's_s', value: 'S', quantity: 20 },
    { id: 's_m', value: 'M', quantity: 30 },
    { id: 's_l', value: 'L', quantity: 15 }
  ]
};

assert.strictEqual(getVariantPrice(standardApparel, { size: 'S' }), 55, 'Size S should fallback to base price 55');
assert.strictEqual(getVariantPrice(standardApparel, { size: 'M' }), 55, 'Size M should fallback to base price 55');
assert.strictEqual(getVariantPrice(standardApparel, { size: 'L' }), 55, 'Size L should fallback to base price 55');
assert.strictEqual(getVariantOriginalPrice(standardApparel, { size: 'M' }), 70, 'Size M should fallback to base originalPrice 70');
assert.strictEqual(hasVariantPricing(standardApparel), false, 'Standard apparel should NOT have variant pricing');
assert.strictEqual(getMinProductPrice(standardApparel), 55, 'Min price should be 55');
console.log('✓ Test 2 Passed: Single-price product seamlessly falls back to base price');

// Test 3: Color variant pricing (e.g. Leather jacket where Black is standard, Gold Edition is premium)
const colorVariantProduct = {
  _id: 'prod_jacket_1',
  name: 'Biker Leather Jacket',
  price: 350,
  variants: [
    { _id: 'var_black', name: 'Black', hex: '#000000', price: 350 },
    { _id: 'var_gold', name: 'Gold Edition', hex: '#d4af37', price: 499, originalPrice: 550 }
  ]
};

assert.strictEqual(getVariantPrice(colorVariantProduct, { variantId: 'var_black' }), 350, 'Black jacket price should be 350');
assert.strictEqual(getVariantPrice(colorVariantProduct, { variantId: 'var_gold' }), 499, 'Gold jacket price should be 499');
assert.strictEqual(getVariantOriginalPrice(colorVariantProduct, { variantId: 'var_gold' }), 550, 'Gold original price should be 550');
assert.strictEqual(hasVariantPricing(colorVariantProduct), true, 'Color variant product should have variant pricing');
console.log('✓ Test 3 Passed: Color / style variants resolve prices correctly');

// Test 4: Combination matrix pricing (specific color + size has special price)
const matrixProduct = {
  _id: 'prod_combo_1',
  name: 'Tailored Wool Suit',
  price: 600,
  colors: [{ tempId: 'navy_c', name: 'Navy', hex: '#000080' }],
  sizes: [{ id: 'sz_xxl', value: 'XXL' }],
  stock: [
    { colorTempId: 'navy_c', sizeId: 'sz_xxl', quantity: 5, price: 680, originalPrice: 750 }
  ]
};

assert.strictEqual(getVariantPrice(matrixProduct, { color: '#000080', size: 'XXL' }), 680, 'Navy XXL combo price should be 680');
assert.strictEqual(getVariantOriginalPrice(matrixProduct, { color: '#000080', size: 'XXL' }), 750, 'Navy XXL combo original price should be 750');
console.log('✓ Test 4 Passed: Combination matrix overrides resolve prices correctly');

// Test 5: Cases A through E verification
// Case A: Actual Price = 500, Discounted = empty -> Sells for 500, no discount
const caseAProduct = {
  _id: 'prod_case_a',
  name: 'Case A Product',
  price: 500,
  sizes: [
    { id: 'v1', value: '100 ml', originalPrice: 500 } // price omitted/empty
  ]
};
const caseAPrice = getVariantPrice(caseAProduct, { size: '100 ml' });
const caseAOrig = getVariantOriginalPrice(caseAProduct, { size: '100 ml' });
assert.strictEqual(caseAPrice, 500, 'Case A: When discounted price is empty, selling price should be originalPrice (500)');
assert.strictEqual(caseAOrig > caseAPrice, false, 'Case A: No discount badge should be shown (originalPrice is not > price)');
console.log('✓ Case A Passed: Actual Price = 500, Discounted = empty -> Sells for 500, no discount');

// Case B: Actual Price = 500, Discounted = 500 -> Sells for 500, no discount
const caseBProduct = {
  _id: 'prod_case_b',
  name: 'Case B Product',
  price: 500,
  sizes: [
    { id: 'v1', value: '100 ml', price: 500, originalPrice: 500 }
  ]
};
const caseBPrice = getVariantPrice(caseBProduct, { size: '100 ml' });
const caseBOrig = getVariantOriginalPrice(caseBProduct, { size: '100 ml' });
assert.strictEqual(caseBPrice, 500, 'Case B: Selling price should be 500');
assert.strictEqual(caseBOrig, 500, 'Case B: Original price should be 500');
assert.strictEqual(caseBOrig > caseBPrice, false, 'Case B: No discount badge should be shown');
console.log('✓ Case B Passed: Actual Price = 500, Discounted = 500 -> Sells for 500, no discount');

// Case C: Actual Price = 500, Discounted = 400 -> Sells for 400, shows 20% discount
const caseCProduct = {
  _id: 'prod_case_c',
  name: 'Case C Product',
  price: 400,
  originalPrice: 500,
  sizes: [
    { id: 'v1', value: '100 ml', price: 400, originalPrice: 500 }
  ]
};
const caseCPrice = getVariantPrice(caseCProduct, { size: '100 ml' });
const caseCOrig = getVariantOriginalPrice(caseCProduct, { size: '100 ml' });
assert.strictEqual(caseCPrice, 400, 'Case C: Selling price should be 400');
assert.strictEqual(caseCOrig, 500, 'Case C: Original price should be 500');
assert.strictEqual(caseCOrig > caseCPrice, true, 'Case C: Discount badge SHOULD be shown');
const discountPercent = Math.round(((caseCOrig - caseCPrice) / caseCOrig) * 100);
assert.strictEqual(discountPercent, 20, 'Case C: Discount percentage should be 20%');
console.log('✓ Case C Passed: Actual Price = 500, Discounted = 400 -> Sells for 400, shows 20% OFF');

// Case D: Discounted without Actual (price = 400, originalPrice omitted)
const caseDProduct = {
  _id: 'prod_case_d',
  name: 'Case D Product',
  price: 400,
  sizes: [
    { id: 'v1', value: '100 ml', price: 400 } // originalPrice omitted
  ]
};
const caseDPrice = getVariantPrice(caseDProduct, { size: '100 ml' });
const caseDOrig = getVariantOriginalPrice(caseDProduct, { size: '100 ml' });
assert.strictEqual(caseDPrice, 400, 'Case D: Selling price is 400');
assert.strictEqual(caseDOrig > caseDPrice, false, 'Case D: No false discount should be shown');
console.log('✓ Case D Passed: Discounted without Actual -> Sells for price, no false discount');

// Case E: Actual Price only (originalPrice = 750, price omitted)
const caseEProduct = {
  _id: 'prod_case_e',
  name: 'Case E Product',
  originalPrice: 750,
  sizes: [
    { id: 'v1', value: '200 ml', originalPrice: 750 }
  ]
};
const caseEPrice = getVariantPrice(caseEProduct, { size: '200 ml' });
const caseEOrig = getVariantOriginalPrice(caseEProduct, { size: '200 ml' });
assert.strictEqual(caseEPrice, 750, 'Case E: Selling price should fallback to originalPrice (750)');
assert.strictEqual(caseEOrig > caseEPrice, false, 'Case E: No discount badge should be shown');
console.log('✓ Case E Passed: Actual Price only -> Sells for Actual Price, no discount');

console.log('--- ALL VARIANT PRICING & CASES A-E TESTS PASSED! ---');
