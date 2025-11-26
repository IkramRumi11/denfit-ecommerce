#!/usr/bin/env node
// Script to update admin user email

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root .env
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set in environment');
  process.exit(1);
}

const oldEmail = 'admin@denfit.com';
const newEmail = 'denfitdatabase@gmail.com';

try {
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  console.log('✅ Connected to MongoDB');

  // Dynamic import to avoid top-level circular imports
  const { default: User } = await import('../models/User.js');

  // Find admin user by old email
  const admin = await User.findOne({ email: oldEmail, role: 'admin' });
  
  if (!admin) {
    // Try to find any admin user
    const anyAdmin = await User.findOne({ role: 'admin' });
    if (anyAdmin) {
      console.log(`⚠️  Admin user found with email: ${anyAdmin.email}`);
      console.log(`Updating to: ${newEmail}`);
      anyAdmin.email = newEmail;
      await anyAdmin.save();
      console.log(`✅ Admin email updated successfully to: ${newEmail}`);
    } else {
      console.error('❌ No admin user found');
      process.exit(1);
    }
  } else {
    // Check if new email already exists
    const existing = await User.findOne({ email: newEmail });
    if (existing && existing._id.toString() !== admin._id.toString()) {
      console.error(`❌ Email ${newEmail} is already in use by another user`);
      process.exit(1);
    }

    // Update email
    admin.email = newEmail;
    await admin.save();
    console.log(`✅ Admin email updated successfully from ${oldEmail} to ${newEmail}`);
  }

  process.exit(0);
} catch (err) {
  console.error('❌ Update failed:', err);
  process.exit(1);
}

