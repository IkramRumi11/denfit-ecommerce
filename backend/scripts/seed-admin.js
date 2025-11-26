#!/usr/bin/env node
// One-time manual seed script to create a default admin user.
// Safety: This script refuses to run unless ALLOW_DEV_BACKDOORS=true or --force is provided.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from project root .env by default
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });

const force = process.argv.includes('--force') || String(process.env.FORCE_SEED).toLowerCase() === 'true';
const allowDev = String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() === 'true';

if (!allowDev && !force) {
  console.error('Refusing to seed admin: set ALLOW_DEV_BACKDOORS=true in your .env or pass --force');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set in environment for seeding');
  process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'denfitdatabase@gmail.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

try {
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  // dynamic import to avoid top-level circular imports
  const { default: User } = await import('../models/User.js');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const created = await User.create({
    name: 'System Administrator',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    emailVerified: true,
  });

  console.log('✅ Created admin:', created.email);
  console.log('⚠️ Please change the password immediately after first login.');
  process.exit(0);
} catch (err) {
  console.error('Seeding failed:', err);
  process.exit(1);
}
