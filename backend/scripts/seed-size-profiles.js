#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });

const force = process.argv.includes('--force') || String(process.env.FORCE_SEED).toLowerCase() === 'true';
const allowDev = String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() === 'true';

if (!allowDev && !force) {
  console.error('Refusing to seed size profiles: set ALLOW_DEV_BACKDOORS=true or pass --force');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI must be set in environment for seeding');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  const { default: SizeProfile } = await import('../models/SizeProfile.js');

  const existing = await SizeProfile.countDocuments();
  if (existing > 0 && !force) {
    console.log('Size profiles already exist; use --force to reseed');
    process.exit(0);
  }

  // Default profiles (basic international-conscious suggestions)
  const profiles = [
    {
      name: 'Clothes - Standard (S,M,L,XL)',
      category: 'clothes',
      type: 'clothes',
      gender: 'unisex',
      isDefault: true,
      sizes: [
        { value: 'S', label: 'Small (S)' },
        { value: 'M', label: 'Medium (M)' },
        { value: 'L', label: 'Large (L)' },
        { value: 'XL', label: 'Extra Large (XL)' },
        { value: 'XXL', label: '2X Large (XXL)' }
      ]
    },
    {
      name: 'Shoes - Men (EU)',
      category: 'shoes',
      type: 'shoes',
      gender: 'men',
      sizes: [
        { value: '40', label: 'EU 40' },{ value: '41', label: 'EU 41' },{ value: '42', label: 'EU 42' },{ value: '43', label: 'EU 43' },{ value: '44', label: 'EU 44' },{ value: '45', label: 'EU 45' },{ value: '46', label: 'EU 46' }
      ]
    },
    {
      name: 'Shoes - Women (EU)',
      category: 'shoes',
      type: 'shoes',
      gender: 'women',
      sizes: [
        { value: '36', label: 'EU 36' },{ value: '37', label: 'EU 37' },{ value: '38', label: 'EU 38' },{ value: '39', label: 'EU 39' },{ value: '40', label: 'EU 40' },{ value: '41', label: 'EU 41' },{ value: '42', label: 'EU 42' }
      ]
    },
    {
      name: 'Shoes - Kids (EU)',
      category: 'shoes',
      type: 'shoes',
      gender: 'kids',
      sizes: [
        { value: '28' },{ value: '29' },{ value: '30' },{ value: '31' },{ value: '32' },{ value: '33' },{ value: '34' },{ value: '35' },{ value: '36' }
      ]
    },
    {
      name: 'Accessories - One Size',
      category: 'accessories',
      type: 'accessory',
      gender: 'unisex',
      sizes: [ { value: 'OS', label: 'One Size' } ]
    }
  ];

  if (force) {
    await SizeProfile.deleteMany({});
  }

  const created = await SizeProfile.insertMany(profiles);
  console.log('Seeded size profiles:', created.map(p => p.name));
  process.exit(0);
} catch (err) {
  console.error('Seeding size profiles failed:', err);
  process.exit(1);
}
