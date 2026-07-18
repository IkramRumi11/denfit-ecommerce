import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';
import StockReservation from '../models/StockReservation.js';
import stockService from '../services/stockService.js';

const run = async () => {
  try {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await Product.deleteMany({});
    await StockReservation.deleteMany({});

    const prod = await Product.create({
      name: 'Concurrency Demo Product',
      description: 'Demo',
      price: 1,
      inventory: 3,
      images: [{ url: 'http://example.com/i.jpg' }],
      category: 'test',
      gender: 'unisex'
    });

    const attempts = 6;
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

    const p = await Product.findById(prod._id).lean();
    const reserved = await StockReservation.countDocuments({ product: prod._id });

    const out = { successCount, failCount, inventory: p.inventory, reservedRecords: reserved };
    // Ensure tmp directory exists
    import fs from 'fs';
    const tmpDir = new URL('../tmp', import.meta.url).pathname;
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}
    const outPath = new URL('../tmp/concurrency-result.json', import.meta.url).pathname;
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('WROTE', outPath);
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(2);
  }
};

run();
