#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';

// Load local .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';

async function run() {
  try {
    // Connect (will fallback to in-memory server in non-prod if needed)
    await connectDB();

    const count = await Product.countDocuments().catch(err => { console.error('countDocuments error', String(err)); return null; });
    const sample = await Product.find().limit(5).lean().catch(err => { console.error('find sample error', String(err)); return [] });
    const categories = await Product.distinct('category').catch(() => []);
    const genders = await Product.distinct('gender').catch(() => []);

    const out = { success: true, count, sample, categories, genders };
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err), stack: err?.stack }, null, 2));
    process.exit(2);
  }
}

run();
