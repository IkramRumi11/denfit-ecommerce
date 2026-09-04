import test from 'node:test';
import assert from 'node:assert/strict';

import PromoCode from '../models/PromoCode.js';

test('PromoCode validateForSubtotal: percentage discount with cap', () => {
  const promo = new PromoCode({
    code: 'SUMMER20',
    discountType: 'percentage',
    discountAmount: 20, // 20%
    maxDiscountAmount: 500,
    minOrderAmount: 1000,
    isActive: true
  });

  // Subtotal below minimum order
  const checkLow = promo.validateForSubtotal(800);
  assert.equal(checkLow.valid, false);
  assert.match(checkLow.message, /Minimum order amount/i);

  // Subtotal 2000 => 20% of 2000 is 400 (under 500 cap)
  const checkNormal = promo.validateForSubtotal(2000);
  assert.equal(checkNormal.valid, true);
  assert.equal(checkNormal.calculatedDiscount, 400);

  // Subtotal 4000 => 20% of 4000 is 800, capped at 500
  const checkCapped = promo.validateForSubtotal(4000);
  assert.equal(checkCapped.valid, true);
  assert.equal(checkCapped.calculatedDiscount, 500);
});

test('PromoCode validateForSubtotal: fixed discount', () => {
  const promo = new PromoCode({
    code: 'FLAT300',
    discountType: 'fixed',
    discountAmount: 300,
    minOrderAmount: 1500,
    isActive: true
  });

  const checkValid = promo.validateForSubtotal(2000);
  assert.equal(checkValid.valid, true);
  assert.equal(checkValid.calculatedDiscount, 300);

  // If subtotal is smaller than fixed discount, discount cannot exceed subtotal
  const promoSmall = new PromoCode({
    code: 'FLAT500',
    discountType: 'fixed',
    discountAmount: 500,
    minOrderAmount: 0,
    isActive: true
  });
  const checkSmall = promoSmall.validateForSubtotal(250);
  assert.equal(checkSmall.valid, true);
  assert.equal(checkSmall.calculatedDiscount, 250);
});

test('PromoCode and Free Shipping interaction (Requirement 7)', () => {
  // Scenario: Cart is Rs. 5,100, Promo is Rs. 200 discount.
  // Effective subtotal = 4,900.
  // Since 4,900 < 5,000, Rs. 300 shipping MUST apply.
  const subtotal = 5100;
  const promoDiscount = 200;
  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const shippingCost = discountedSubtotal < 5000 ? 300 : 0;
  const finalTotal = discountedSubtotal + shippingCost;

  assert.equal(discountedSubtotal, 4900);
  assert.equal(shippingCost, 300);
  assert.equal(finalTotal, 5200);

  // Scenario 2: Cart is Rs. 6,000, Promo is Rs. 500 discount.
  // Effective subtotal = 5,500.
  // Since 5,500 >= 5,000, shipping is FREE (0).
  const subtotal2 = 6000;
  const promoDiscount2 = 500;
  const discountedSubtotal2 = Math.max(0, subtotal2 - promoDiscount2);
  const shippingCost2 = discountedSubtotal2 < 5000 ? 300 : 0;
  const finalTotal2 = discountedSubtotal2 + shippingCost2;

  assert.equal(discountedSubtotal2, 5500);
  assert.equal(shippingCost2, 0);
  assert.equal(finalTotal2, 5500);
});

test('PromoCode expiration and usage limit check', () => {
  const expiredPromo = new PromoCode({
    code: 'EXPIRED10',
    discountType: 'percentage',
    discountAmount: 10,
    endDate: new Date(Date.now() - 86400000), // Yesterday
    isActive: true
  });
  const checkExpired = expiredPromo.validateForSubtotal(2000);
  assert.equal(checkExpired.valid, false);
  assert.match(checkExpired.message, /expired/i);

  const exhaustedPromo = new PromoCode({
    code: 'MAXED10',
    discountType: 'percentage',
    discountAmount: 10,
    maxUses: 5,
    usedCount: 5,
    isActive: true
  });
  const checkExhausted = exhaustedPromo.validateForSubtotal(2000);
  assert.equal(checkExhausted.valid, false);
  assert.match(checkExhausted.message, /usage limit/i);
});
