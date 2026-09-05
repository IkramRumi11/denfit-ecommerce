import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRevenueRecognized,
  getRecognizedRevenueMatch,
  getPipelineRevenueMatch,
  getCancelledOrdersMatch,
  calculateOrderFinancials,
} from '../utils/financialHelper.js';
import StoreCredit from '../models/StoreCredit.js';

test('Revenue Recognition Rule: Only delivered + paid orders count as recognized revenue', () => {
  // 1. Delivered + Paid => Recognized
  assert.equal(isRevenueRecognized({ status: 'delivered', paymentStatus: 'paid' }), true);

  // 2. Pending / Processing / Shipped orders NEVER recognize revenue (even if paid online)
  assert.equal(isRevenueRecognized({ status: 'pending', paymentStatus: 'paid' }), false);
  assert.equal(isRevenueRecognized({ status: 'processing', paymentStatus: 'paid' }), false);
  assert.equal(isRevenueRecognized({ status: 'shipped', paymentStatus: 'paid' }), false);

  // 3. Delivered but payment unpaid / pending => No revenue
  assert.equal(isRevenueRecognized({ status: 'delivered', paymentStatus: 'pending' }), false);
  assert.equal(isRevenueRecognized({ status: 'delivered', paymentStatus: 'failed' }), false);

  // 4. Cancelled or Refunded => No revenue
  assert.equal(isRevenueRecognized({ status: 'cancelled', paymentStatus: 'paid' }), false);
  assert.equal(isRevenueRecognized({ status: 'refunded', paymentStatus: 'refunded' }), false);
});

test('Financial Helper Match Queries enforce strict criteria', () => {
  const recMatch = getRecognizedRevenueMatch();
  assert.deepEqual(recMatch, { status: 'delivered', paymentStatus: 'paid' });

  const pipeMatch = getPipelineRevenueMatch();
  assert.deepEqual(pipeMatch, { status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] } });

  const cancelMatch = getCancelledOrdersMatch();
  assert.deepEqual(cancelMatch, { status: 'cancelled' });
});

test('calculateOrderFinancials: computes gross vs net revenue correctly', () => {
  // Delivered order with 3000 subtotal, 300 discount, 300 shipping, 0 refund
  const order1 = {
    status: 'delivered',
    paymentStatus: 'paid',
    subtotal: 3000,
    discountAmount: 300,
    storeCreditAmount: 0,
    shippingCost: 300,
    refundAmount: 0,
    total: 3000,
  };
  const fin1 = calculateOrderFinancials(order1);
  assert.equal(fin1.isRecognized, true);
  assert.equal(fin1.grossTotal, 3000);
  assert.equal(fin1.netRecognizedRevenue, 3000);

  // Delivered order with store credit and partial refund
  const order2 = {
    status: 'delivered',
    paymentStatus: 'paid',
    subtotal: 5000,
    discountAmount: 500,
    storeCreditAmount: 1000,
    shippingCost: 0,
    refundAmount: 500,
    total: 3500,
  };
  const fin2 = calculateOrderFinancials(order2);
  assert.equal(fin2.isRecognized, true);
  assert.equal(fin2.grossTotal, 3500);
  assert.equal(fin2.netRecognizedRevenue, 3000); // 3500 - 500 refund

  // Shipped in-flight order => 0 recognized
  const order3 = {
    status: 'shipped',
    paymentStatus: 'paid',
    subtotal: 4000,
    discountAmount: 0,
    shippingCost: 0,
    refundAmount: 0,
    total: 4000,
  };
  const fin3 = calculateOrderFinancials(order3);
  assert.equal(fin3.isRecognized, false);
  assert.equal(fin3.grossTotal, 4000);
  assert.equal(fin3.netRecognizedRevenue, 0);
});

test('StoreCredit Model: validation and deduction lifecycle', () => {
  const voucher = new StoreCredit({
    code: 'DF-CREDIT-TEST01',
    initialAmount: 2500,
    remainingBalance: 2500,
    status: 'active',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days ahead
  });

  // 1. Partial redemption (subtotal 1500, voucher 2500)
  const val1 = voucher.validateForSubtotal(1500);
  assert.equal(val1.valid, true);
  assert.equal(val1.discountAmount, 1500);
  assert.equal(val1.newRemainingBalance, 1000);

  // 2. Full redemption (subtotal 4000, voucher 2500)
  const val2 = voucher.validateForSubtotal(4000);
  assert.equal(val2.valid, true);
  assert.equal(val2.discountAmount, 2500);
  assert.equal(val2.newRemainingBalance, 0);

  // 3. Deduct balance updates status to fully_redeemed when 0 remaining
  voucher.deductBalance(2500, '60c72b2f9b1d8b0015f8c8a1');
  assert.equal(voucher.remainingBalance, 0);
  assert.equal(voucher.status, 'fully_redeemed');
  assert.equal(voucher.redeemedOrders.length, 1);
  assert.equal(voucher.redeemedOrders[0].amountDeducted, 2500);

  // 4. Redeeming fully redeemed voucher should fail
  const val3 = voucher.validateForSubtotal(1000);
  assert.equal(val3.valid, false);
  assert.match(val3.message, /fully redeemed/i);
});
