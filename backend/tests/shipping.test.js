import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShippingFee, interpolateShippingMessage, DEFAULT_SHIPPING_CONFIG } from '../utils/shippingHelper.js';

test('calculateShippingFee: default configuration', () => {
  // Below 5000 threshold -> 300
  assert.equal(calculateShippingFee(0), 300);
  assert.equal(calculateShippingFee(4999), 300);
  assert.equal(calculateShippingFee(2500), 300);

  // At or above 5000 threshold -> 0 (Free)
  assert.equal(calculateShippingFee(5000), 0);
  assert.equal(calculateShippingFee(5001), 0);
  assert.equal(calculateShippingFee(10000), 0);
});

test('calculateShippingFee: custom threshold and fee', () => {
  const customConfig = {
    shippingFee: 450,
    freeShippingThreshold: 7500,
    isFreeShippingEnabled: true,
    isShippingEnabled: true
  };

  // Below 7500 -> 450
  assert.equal(calculateShippingFee(7499, customConfig), 450);
  assert.equal(calculateShippingFee(1000, customConfig), 450);

  // At or above 7500 -> 0
  assert.equal(calculateShippingFee(7500, customConfig), 0);
  assert.equal(calculateShippingFee(8000, customConfig), 0);
});

test('calculateShippingFee: promo discount crossing the threshold', () => {
  const config = {
    shippingFee: 300,
    freeShippingThreshold: 5000,
    isFreeShippingEnabled: true,
    isShippingEnabled: true
  };

  const originalSubtotal = 5200;
  const promoDiscount = 400;
  const discountedSubtotal = Math.max(0, originalSubtotal - promoDiscount); // 4800

  // 4800 is below 5000 -> shipping fee of 300 must apply
  const fee = calculateShippingFee(discountedSubtotal, config);
  assert.equal(fee, 300);

  const finalTotal = discountedSubtotal + fee;
  assert.equal(finalTotal, 5100);
});

test('calculateShippingFee: 100% free shipping mode (shipping disabled or 0 fee)', () => {
  const disabledConfig = {
    shippingFee: 300,
    freeShippingThreshold: 5000,
    isFreeShippingEnabled: true,
    isShippingEnabled: false // Global free shipping
  };

  assert.equal(calculateShippingFee(500, disabledConfig), 0);
  assert.equal(calculateShippingFee(2000, disabledConfig), 0);

  const zeroFeeConfig = {
    shippingFee: 0,
    freeShippingThreshold: 5000,
    isFreeShippingEnabled: true,
    isShippingEnabled: true
  };

  assert.equal(calculateShippingFee(500, zeroFeeConfig), 0);
});

test('calculateShippingFee: flat shipping mode (free shipping threshold disabled)', () => {
  const flatConfig = {
    shippingFee: 350,
    freeShippingThreshold: 5000,
    isFreeShippingEnabled: false, // No threshold -> all orders charged standard fee
    isShippingEnabled: true
  };

  assert.equal(calculateShippingFee(1000, flatConfig), 350);
  assert.equal(calculateShippingFee(5000, flatConfig), 350);
  assert.equal(calculateShippingFee(20000, flatConfig), 350);
});

test('interpolateShippingMessage: replaces shipping-related text dynamically and preserves unrelated messages', () => {
  const config = {
    shippingFee: 350,
    freeShippingThreshold: 8000,
    isFreeShippingEnabled: true,
    isShippingEnabled: true
  };

  // Shipping messages should be updated with new threshold
  const msg1 = 'Free shipping on orders over ₨5,000';
  assert.equal(interpolateShippingMessage(msg1, config), 'Free shipping on orders over Rs. 8,000');

  const msg2 = '📢 Free shipping on orders over Rs. 5,000';
  assert.equal(interpolateShippingMessage(msg2, config), '📢 Free shipping on orders over Rs. 8,000');

  // Unrelated messages MUST NOT be changed
  const unrelated1 = '🔥 Summer Sale: 20% OFF on Men Collection!';
  assert.equal(interpolateShippingMessage(unrelated1, config), unrelated1);

  const unrelated2 = 'New Arrivals in Stock — Shop Now!';
  assert.equal(interpolateShippingMessage(unrelated2, config), unrelated2);
});
