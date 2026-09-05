import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStoreCreditCode } from '../utils/financialHelper.js';
import Order from '../models/Order.js';

test('Store Credit Code generation matches DF-CREDIT-XXXXXX format', async () => {
  const code = await generateStoreCreditCode();
  assert.match(code, /^DF-CREDIT-[A-Z0-9]+$/);
  assert.equal(code.startsWith('DF-CREDIT-'), true);
});

test('Order Item Exchange subdocument structure and status transitions', () => {
  const order = new Order({
    orderNumber: 'TEST-ORD-001',
    customer: '60c72b2f9b1d8b0015f8c8a1',
    customerEmail: 'test@example.com',
    items: [
      {
        product: '60c72b2f9b1d8b0015f8c8b2',
        name: 'Classic Black Tee',
        quantity: 1,
        price: 2500,
        size: 'M',
        color: 'black',
        exchange: {
          status: 'none'
        }
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Karachi',
      phone: '03001234567'
    },
    subtotal: 2500,
    shippingCost: 0,
    total: 2500,
    paymentMethod: 'cash_on_delivery',
    status: 'delivered',
    paymentStatus: 'paid'
  });

  const item = order.items[0];
  assert.equal(item.exchange.status, 'none');

  // Customer requests exchange
  item.exchange.status = 'requested';
  item.exchange.reason = 'Size too small';
  item.exchange.desiredSize = 'L';
  item.exchange.customerNote = 'Please send Large size instead';
  item.exchange.requestedAt = new Date();

  assert.equal(item.exchange.status, 'requested');
  assert.equal(item.exchange.desiredSize, 'L');

  // Admin approves exchange and sets store credit
  item.exchange.status = 'store_credited';
  item.exchange.storeCreditCode = 'DF-CREDIT-ABC123';
  item.exchange.storeCreditIssued = 2500;
  item.exchange.processedAt = new Date();

  assert.equal(item.exchange.status, 'store_credited');
  assert.equal(item.exchange.storeCreditCode, 'DF-CREDIT-ABC123');
  assert.equal(item.exchange.storeCreditIssued, 2500);

  // Global order status remains delivered
  assert.equal(order.status, 'delivered');
});
