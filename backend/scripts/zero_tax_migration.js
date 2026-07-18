/*
  scripts/zero_tax_migration.js
  Safe one-time migration to zero-out taxAmount on existing orders while preserving legacyTax.

  Usage (run from repo root):
    node backend/scripts/zero_tax_migration.js

  Requirements: ensure MONGODB_URI is set in environment or provide via CLI.
*/

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/denfit';
const DRY_RUN = String(process.env.ZERO_TAX_MIGRATION_DRY_RUN || 'true').toLowerCase() === 'true';

async function run() {
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected. Scanning orders...');

  const cursor = Order.find().cursor();
  let updated = 0;
  const updatedIds = [];
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const tax = Number(doc.taxAmount || 0);
    const subtotal = Number(doc.subtotal || 0);
    const shipping = Number(doc.shippingCost || 0);
    const expectedCustomerTotal = Math.round((subtotal + shipping) * 100) / 100;

    if (tax > 0 || Number(doc.total || 0) !== expectedCustomerTotal) {
      // Preserve legacy tax in a separate field if not already present
      if (typeof doc.legacyTax === 'undefined' && tax > 0) {
        doc.legacyTax = tax;
      }
      doc.taxAmount = 0;
      doc.total = expectedCustomerTotal; // make total match customer-facing total
      if (DRY_RUN) {
        console.log('[DRY RUN] Would update order', String(doc._id), 'tax', tax, '-> 0 total', Number(doc.total), '->', expectedCustomerTotal);
        updatedIds.push(String(doc._id));
        updated++;
      } else {
        await doc.save();
        console.log('Updated order', String(doc._id), 'tax', tax, '-> 0 total set to', expectedCustomerTotal);
        updatedIds.push(String(doc._id));
        updated++;
      }
    }
  }

  console.log('Migration complete. Orders updated:', updated);
  if (updatedIds.length) console.log('Sample updated order ids:', updatedIds.slice(0, 20).join(', '));
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
