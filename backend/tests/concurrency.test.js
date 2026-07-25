import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';
import StockReservation from '../models/StockReservation.js';
import stockService from '../services/stockService.js';

before(async () => {
  // Ensure we have a fresh in-memory DB for tests
  process.env.NODE_ENV = 'test';
  await connectDB();
  await Product.deleteMany({});
  await StockReservation.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
});

test('concurrent reservations do not oversell', async (t) => {
  // Create a product with inventory 3
  const prod = await Product.create({
    name: 'Concurrency Test Product',
    description: 'Test product for concurrency',
    price: 10,
    inventory: 3,
    images: [{ url: 'http://example.com/i.jpg' }],
    category: 'test',
    gender: 'unisex'
  });

  const attempts = 6; // attempt more than inventory

  const promises = [];
  for (let i = 0; i < attempts; i++) {
    promises.push((async () => {
      try {
        const r = await stockService.reserveStockForOrder([{ productId: prod._id.toString(), quantity: 1 }], { ttlMs: 60000 });
        return { ok: true, reservations: r };
      } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
      }
    })());
  }

  const results = await Promise.all(promises);

  const successCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;

  // Diagnostic output to help debug concurrency behavior
  console.log('diag: successCount=', successCount, 'failCount=', failCount);

  // Reload product and reservation counts
  const p = await Product.findById(prod._id).lean();
  const reserved = await StockReservation.countDocuments({ product: prod._id, status: 'reserved' });
  console.log('diag: inventory=', p.inventory, 'reserved=', reserved);

  // Expect only 3 successes (inventory) and the rest fail
  assert.equal(successCount, 3, `Expected 3 successful reservations, got ${successCount}`);
  assert.equal(failCount, attempts - 3, `Expected ${attempts - 3} failures, got ${failCount}`);

  assert.equal(p.inventory, 0, 'Expected inventory to be decremented to 0');
  assert.equal(reserved, 3, 'Expected 3 reserved reservations');
});
