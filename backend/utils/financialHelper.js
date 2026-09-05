// backend/utils/financialHelper.js
import crypto from 'crypto';
import StoreCredit from '../models/StoreCredit.js';

/**
 * Single Source of Truth for DENFiT Revenue & Financial Calculations.
 *
 * Core Revenue Recognition Rule:
 * Revenue is strictly recognized ONLY when:
 *   1. order.status === 'delivered'
 *   2. order.paymentStatus === 'paid'
 *
 * Pending, Confirmed, Processing, Shipped, and Cancelled orders yield Rs. 0 recognized revenue.
 * For Cash on Delivery, marking an order 'delivered' automatically transitions paymentStatus to 'paid'.
 */

/**
 * MongoDB Aggregation Match expression for Recognized Revenue.
 * @param {Object} extraMatch Optional additional query filters (e.g. date ranges)
 * @returns {Object} Match query
 */
export const getRecognizedRevenueMatch = (extraMatch = {}) => ({
  status: 'delivered',
  paymentStatus: 'paid',
  ...extraMatch
});

/**
 * MongoDB Aggregation Match expression for Pipeline / Deferred Revenue (unfulfilled active orders).
 * @param {Object} extraMatch Optional additional query filters
 * @returns {Object} Match query
 */
export const getPipelineRevenueMatch = (extraMatch = {}) => ({
  status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] },
  ...extraMatch
});

/**
 * MongoDB Aggregation Match expression for Cancelled orders.
 * @param {Object} extraMatch Optional additional query filters
 * @returns {Object} Match query
 */
export const getCancelledOrdersMatch = (extraMatch = {}) => ({
  status: 'cancelled',
  ...extraMatch
});

/**
 * MongoDB aggregation expression to compute an order's net recognized value.
 * Net Recognized = max(0, subtotal - discountAmount - storeCreditAmount) + shippingCost - refundAmount
 */
export const ORDER_NET_REVENUE_EXPR = {
  $max: [
    0,
    {
      $subtract: [
        {
          $add: [
            {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$subtotal', 0] },
                    {
                      $add: [
                        { $ifNull: ['$discountAmount', 0] },
                        { $ifNull: ['$storeCreditAmount', 0] }
                      ]
                    }
                  ]
                }
              ]
            },
            { $ifNull: ['$shippingCost', 0] }
          ]
        },
        { $ifNull: ['$refundAmount', 0] }
      ]
    }
  ]
};

/**
 * MongoDB aggregation expression to compute an order's gross revenue value (before cash refunds).
 */
export const ORDER_GROSS_REVENUE_EXPR = {
  $add: [
    {
      $max: [
        0,
        {
          $subtract: [
            { $ifNull: ['$subtotal', 0] },
            {
              $add: [
                { $ifNull: ['$discountAmount', 0] },
                { $ifNull: ['$storeCreditAmount', 0] }
              ]
            }
          ]
        }
      ]
    },
    { $ifNull: ['$shippingCost', 0] }
  ]
};

/**
 * Check whether an in-memory Order document is recognized revenue.
 * @param {Object} order
 * @returns {boolean}
 */
export const isRevenueRecognized = (order) => {
  if (!order) return false;
  return order.status === 'delivered' && order.paymentStatus === 'paid';
};

/**
 * Calculate financial totals on an in-memory Order document.
 * @param {Object} order
 * @returns {Object} Financial summary
 */
export const calculateOrderFinancials = (order) => {
  if (!order) {
    return {
      subtotal: 0,
      discountAmount: 0,
      storeCreditAmount: 0,
      shippingCost: 0,
      grossTotal: 0,
      refundAmount: 0,
      netRecognizedRevenue: 0,
      isRecognized: false
    };
  }

  const subtotal = Number(order.subtotal || 0);
  const discountAmount = Number(order.discountAmount || 0);
  const storeCreditAmount = Number(order.storeCreditAmount || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const refundAmount = Number(order.refundAmount || 0);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount - storeCreditAmount);
  const grossTotal = Math.round((discountedSubtotal + shippingCost) * 100) / 100;
  const isRecognized = isRevenueRecognized(order);
  const netRecognizedRevenue = isRecognized ? Math.max(0, Math.round((grossTotal - refundAmount) * 100) / 100) : 0;

  return {
    subtotal,
    discountAmount,
    storeCreditAmount,
    shippingCost,
    grossTotal,
    refundAmount,
    netRecognizedRevenue,
    isRecognized
  };
};

import mongoose from 'mongoose';

/**
 * Generates a collision-safe, branded Store Credit Voucher Code.
 * Format: DF-CREDIT-XXXXXX (e.g., DF-CREDIT-7B9A2F)
 * @returns {Promise<string>}
 */
export const generateStoreCreditCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `DF-CREDIT-${hex}`;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const existing = await StoreCredit.findOne({ code: candidate }).select('_id').lean();
      if (!existing) return candidate;
    } else {
      return candidate;
    }
  }
  const fallback = `DF-CREDIT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  return fallback;
};

/**
 * Issue a Store Credit voucher for an exchange / return.
 * @param {Object} params
 * @param {Object} params.order Order document
 * @param {string} params.orderItemId Order item ID
 * @param {number} params.amount Credit amount in PKR
 * @param {string} params.reason Reason description
 * @param {Object} params.adminUser Admin user who approved
 * @returns {Promise<Object>} Created StoreCredit document
 */
export const issueStoreCredit = async ({ order, orderItemId, amount, reason, adminUser }) => {
  const code = await generateStoreCreditCode();
  const numAmount = Math.max(0.01, Math.round(Number(amount) * 100) / 100);

  const creditDoc = await StoreCredit.create({
    code,
    customer: order.customer ? (order.customer._id || order.customer) : undefined,
    guestEmail: order.guestEmail || order.contactEmail || order.shippingAddress?.email || undefined,
    originalOrder: order._id,
    orderItemId: orderItemId || undefined,
    initialAmount: numAmount,
    remainingBalance: numAmount,
    status: 'active',
    reason: reason || 'Item Exchange / Store Credit Voucher',
    adminNote: `Issued by ${adminUser?.name || adminUser?.email || 'admin'} for Order ${order.orderNumber || order._id}`,
    createdBy: adminUser?._id || undefined,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  });

  return creditDoc;
};
