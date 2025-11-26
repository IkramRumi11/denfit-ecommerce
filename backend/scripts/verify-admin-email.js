// One-off script: mark a given email as verified and admin
// Usage: node ./scripts/verify-admin-email.js [email]

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const emailArg = process.argv[2] || process.env.VERIFY_ADMIN_EMAIL || 'denfitdatabase@gmail.com';
if (!emailArg) {
  console.error('Please provide an email as the first argument or set VERIFY_ADMIN_EMAIL in .env');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set in environment');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  const { default: User } = await import('../models/User.js');

  const normalized = emailArg.toLowerCase().trim();
  const user = await User.findOne({ email: normalized });
  if (!user) {
    console.error('No user found with email', normalized);
    process.exit(2);
  }

  let changed = false;
  if (!user.emailVerified) {
    user.emailVerified = true;
    changed = true;
  }
  if (user.role !== 'admin') {
    user.role = 'admin';
    changed = true;
  }

  // Optionally grant broad admin permissions for UI convenience in dev
  try {
    const extra = ['users.view','products.view','orders.view','audits.view','settings.view'];
    user.permissions = Array.isArray(user.permissions) ? Array.from(new Set([...user.permissions, ...extra])) : extra;
    changed = true;
  } catch (e) {
    // ignore if schema doesn't have permissions
  }

  if (changed) {
    await user.save({ validateBeforeSave: false });
    console.log('✅ Updated user:', user.email, '-> emailVerified=true, role=admin');
  } else {
    console.log('No changes required for', normalized);
  }

  process.exit(0);
} catch (err) {
  console.error('Failed to update user:', err);
  process.exit(1);
}
