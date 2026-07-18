#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';

// Load local .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

async function run() {
  try {
    // Connect (will fallback to in-memory server in non-prod if needed)
    await connectDB();

    const productCount = await Product.countDocuments().catch(() => null);
    const categoryCount = await Category.countDocuments().catch(() => null);
    const orderCount = await Order.countDocuments().catch(() => null);

    const out = { success: true, productCount, categoryCount, orderCount };
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err), stack: err?.stack }, null, 2));
    process.exit(2);
  }
}

run();
