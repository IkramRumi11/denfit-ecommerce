#!/usr/bin/env node
// backend/scripts/reactivate-missing-active.js
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../src/config/database.js';

// Load backend .env if present (script may be run from repo root)
const envPath = path.resolve(process.cwd(), 'backend', '.env');
const loaded = dotenv.config({ path: envPath });
if (loaded.error) {
  // fallback to default env
  dotenv.config();
}

const run = async () => {
  try {
    console.log('Connecting to DB...');
    await connectDB();

    const res = await User.updateMany(
      { active: { $exists: false } },
      { $set: { active: true } }
    );

    console.log(`Updated ${res.modifiedCount} users to set active=true where missing.`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating users:', err);
    process.exit(1);
  }
};

run();
