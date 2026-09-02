/**
 * Categories Seed Script
 *
 * Migrates the hardcoded megaMenuData structure to the Category model.
 * This makes categories manageable from the Admin Panel and enables
 * dynamic category-filter assignments.
 *
 * Structure migrated:
 * megaMenuData[gender][section][items] → Category hierarchy
 *
 * Usage: node --experimental-modules backend/seeds/categoriesSeed.js
 * Or via npm: npm run seed:categories
 *
 * Safe to run multiple times — uses upsert logic.
 *
 * Import Note: This script reads from frontend megaMenuData.ts by copying
 * the structure here to avoid cross-package dependencies.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

import Category from '../models/Category.js';
import CategoryFilterConfig from '../models/CategoryFilterConfig.js';
import SizeProfile from '../models/SizeProfile.js';

const makeSlug = (v) => String(v || '')
  .toLowerCase()
  .replace(/[^a-z0-9 -]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

// ============================================================
// CATEGORY STRUCTURE - Migrated from megaMenuData
// ============================================================
// Structure: { gender → { section → [subcategories] } }
// This matches the megaMenuData.ts structure
const CATEGORY_STRUCTURE = {
  men: {
    Clothing: ['T-Shirts', 'Shirts', 'Polo', 'Hoodies-Sweatshirts', 'Pants-Trousers', 'Jeans', 'Shorts', 'Jackets-Coats', 'Suits-Blazers'],
    Footwear: ['Sneakers', 'Loafers', 'Boots', 'Sandals', 'Formal-Shoes', 'Sports-Shoes'],
    Accessories: ['Watches', 'Belts', 'Wallets', 'Bags', 'Sunglasses', 'Hats-Caps', 'Ties', 'Jewelry', 'Scarves']
  },
  women: {
    Clothing: ['Dresses', 'Tops-Blouses', 'Sweaters-Knits', 'Skirts', 'Co-ord-Sets', 'Jumpsuits-Rompers', 'Pants-Jeans', 'Jackets'],
    Footwear: ['Heels', 'Flats', 'Boots', 'Sandals', 'Sneakers', 'Espadrilles'],
    Accessories: ['Handbags', 'Jewelry', 'Scarves', 'Sunglasses', 'Watches', 'Belts', 'Hats', 'Wallets']
  },
  kids: {
    'Boys Clothing': ['T-Shirts-Tops', 'Pants-Jeans', 'Sets-Outfits', 'Jackets', 'Bodysuits', 'Rompers', 'Sleepwear'],
    'Boys Footwear': ['Shoes', 'Sneakers', 'Sandals'],
    'Girls Clothing': ['Tops-Dresses', 'Pants-Skirts', 'Sets-Outfits', 'Jackets', 'Bodysuits', 'Rompers', 'Sleepwear'],
    'Girls Footwear': ['Shoes', 'Sneakers', 'Sandals'],
    Accessories: ['Bags', 'Hats', 'Accessories']
  },
  sale: {
    'Men Sale': ['All', 'Clothing', 'Footwear', 'Accessories'],
    'Women Sale': ['All', 'Clothing', 'Footwear', 'Accessories'],
    'Kids Sale': ['All', 'Clothing', 'Footwear', 'Accessories']
  },
  accessories: {
    Unisex: ['Watches', 'Sunglasses', 'Scarves', 'Bags', 'Jewelry', 'Belts', 'Hats', 'Wallets']
  }
};

// ============================================================
// PRODUCT TYPE MAPPING
// Determines which SizeProfile and filters to use
// ============================================================
const PRODUCT_TYPE_MAP = {
  't-shirts': 'clothing',
  'shirts': 'clothing',
  'polo': 'clothing',
  'hoodies-sweatshirts': 'clothing',
  'pants-trousers': 'clothing',
  'pants-jeans': 'clothing',
  'jeans': 'clothing',
  'shorts': 'clothing',
  'jackets-coats': 'clothing',
  'jackets': 'clothing',
  'suits-blazers': 'clothing',
  'dresses': 'clothing',
  'tops-blouses': 'clothing',
  'tops-dresses': 'clothing',
  'sweaters-knits': 'clothing',
  'skirts': 'clothing',
  'pants-skirts': 'clothing',
  'co-ord-sets': 'clothing',
  'jumpsuits-rompers': 'clothing',
  'bodysuits': 'clothing',
  'rompers': 'clothing',
  'sleepwear': 'clothing',
  't-shirts-tops': 'clothing',

  'sneakers': 'footwear',
  'loafers': 'footwear',
  'boots': 'footwear',
  'sandals': 'footwear',
  'formal-shoes': 'footwear',
  'sports-shoes': 'footwear',
  'heels': 'footwear',
  'flats': 'footwear',
  'espadrilles': 'footwear',
  'shoes': 'footwear',

  'watches': 'accessories',
  'belts': 'accessories',
  'wallets': 'accessories',
  'bags': 'accessories',
  'handbags': 'accessories',
  'sunglasses': 'accessories',
  'hats': 'accessories',
  'hats-caps': 'accessories',
  'ties': 'accessories',
  'jewelry': 'accessories',
  'scarves': 'accessories'
};

// ============================================================
// DEFAULT SIZE PROFILE MAPPING
// Maps productType to SizeProfile names (will be looked up after SizeProfile seed)
// ============================================================
const SIZE_PROFILE_NAMES = {
  'clothing': 'Clothes - Standard (S,M,L,XL)',
  'footwear': 'Shoes - Standard', // Will need gender-specific lookup
  'accessories': 'Accessories - One Size'
};

// ============================================================
// SEEDING LOGIC
// ============================================================
async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/denfit';
  console.log(`\n🌱 Connecting to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  // Fetch existing SizeProfiles and CategoryFilterConfigs
  console.log('📋 Loading SizeProfiles and CategoryFilterConfigs...');
  const sizeProfiles = await SizeProfile.find({}).lean();
  const sizeProfileMap = {}; // name → ObjectId
  sizeProfiles.forEach(sp => {
    sizeProfileMap[sp.name] = sp._id;
  });

  const categoryFilterConfigs = await CategoryFilterConfig.find({}).lean();
  const configMap = {}; // categorySlug + gender → ObjectId
  categoryFilterConfigs.forEach(cfg => {
    const key = `${cfg.categorySlug}:${cfg.gender || ''}`;
    configMap[key] = cfg._id;
  });

  if (Object.keys(sizeProfileMap).length === 0) {
    console.warn(`⚠ No SizeProfiles found! Make sure to run 'npm run seed:size-profiles' first.`);
  }
  if (Object.keys(configMap).length === 0) {
    console.warn(`⚠ No CategoryFilterConfigs found! Make sure to run 'npm run seed:filters' first.`);
  }

  // Seed top-level gender/section categories
  console.log('\n📦 Seeding Top-Level Categories (Men, Women, Kids, Sale, Accessories)...');
  const topLevelMap = {}; // slug → ObjectId
  const topLevelCategories = ['men', 'women', 'kids', 'sale', 'accessories'];

  for (const slug of topLevelCategories) {
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    // Match either existing slug or existing name to avoid duplicate-key errors
    const existing = await Category.findOneAndUpdate(
      { $or: [{ slug }, { name }] },
      {
        $set: {
          name,
          description: `${name} collection`,
          featured: true,
          productType: 'other',
          parent: null
        },
        $setOnInsert: { slug }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    topLevelMap[slug] = existing._id;
    console.log(`  ✓ ${name}`);
  }

  // Seed section categories (e.g., Clothing, Footwear, Accessories under Men)
  console.log('\n📦 Seeding Section Categories (Clothing, Footwear, etc.)...');
  const sectionMap = {}; // section + parent → ObjectId

  for (const [genderSlug, sections] of Object.entries(CATEGORY_STRUCTURE)) {
    const genderId = topLevelMap[genderSlug];

    for (const [sectionName, subcategories] of Object.entries(sections)) {
      const sectionSlug = makeSlug(sectionName);
      // If a category with the same name exists elsewhere (different parent),
      // disambiguate the name by appending the gender to avoid unique-name collisions.
      let finalSectionName = sectionName;
      const existingNameConflict = await Category.findOne({ name: sectionName }).lean();
      if (existingNameConflict && String(existingNameConflict.parent || '') !== String(genderId)) {
        finalSectionName = `${sectionName} (${genderSlug})`;
      }

      // Match by parent + (slug or name) to be idempotent when similar names exist
      const existing = await Category.findOneAndUpdate(
        { parent: genderId, $or: [{ slug: `${genderSlug}-${sectionSlug}` }, { name: finalSectionName }] },
        {
          $set: {
            name: finalSectionName,
            description: `${sectionName} in ${genderSlug}`,
            featured: false,
            productType: 'other',
            parent: genderId
          },
          $setOnInsert: { slug: `${genderSlug}-${sectionSlug}` }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const sectionKey = `${genderSlug}:${sectionName}`;
      sectionMap[sectionKey] = existing._id;
      console.log(`  ✓ ${genderSlug} > ${sectionName}`);
    }
  }

  // Seed subcategory categories (the actual product categories)
  console.log('\n📦 Seeding Subcategories (T-Shirts, Shoes, etc.)...');
  let subcategoryCount = 0;

  for (const [genderSlug, sections] of Object.entries(CATEGORY_STRUCTURE)) {
    const genderId = topLevelMap[genderSlug];

    for (const [sectionName, subcategories] of Object.entries(sections)) {
      const sectionKey = `${genderSlug}:${sectionName}`;
      const sectionId = sectionMap[sectionKey];

      for (const subcategoryName of subcategories) {
        const subcategorySlug = makeSlug(subcategoryName);
        const productType = PRODUCT_TYPE_MAP[subcategorySlug] || 'other';

        // Determine size profile
        let sizeProfileId = null;
        if (productType === 'clothing') {
          sizeProfileId = sizeProfileMap['Clothes - Standard (S,M,L,XL)'];
        } else if (productType === 'footwear') {
          // For footwear, try gender-specific
          if (genderSlug === 'men') {
            sizeProfileId = sizeProfileMap['Shoes - Men (EU)'];
          } else if (genderSlug === 'women') {
            sizeProfileId = sizeProfileMap['Shoes - Women (EU)'];
          } else if (genderSlug === 'kids') {
            sizeProfileId = sizeProfileMap['Shoes - Kids (EU)'];
          } else {
            sizeProfileId = sizeProfileMap['Shoes - Standard'];
          }
        } else if (productType === 'accessories') {
          sizeProfileId = sizeProfileMap['Accessories - One Size'];
        }

        // Look up CategoryFilterConfig
        const configKey = `${subcategorySlug}:${genderSlug === 'men' || genderSlug === 'women' || genderSlug === 'kids' ? genderSlug : ''}`;
        const alternateConfigKey = `${subcategorySlug}:`;
        const filterConfigId = configMap[configKey] || configMap[alternateConfigKey] || null;
        // Disambiguate subcategory display name if a global conflict exists
        let displayName = subcategoryName.replace(/-/g, ' ');
        const existingSubConflict = await Category.findOne({ name: displayName }).lean();
        if (existingSubConflict && String(existingSubConflict.parent || '') !== String(sectionId)) {
          displayName = `${displayName} (${sectionName})`;
        }

        // Compute section slug and use a composite slug including gender and section to ensure global uniqueness
        const sectionSlug = makeSlug(sectionName);
        const finalSlug = `${genderSlug}-${sectionSlug}-${subcategorySlug}`;

        // Use parent + (finalSlug or displayName) so reruns don't create duplicates when names or slugs collide
        const existing = await Category.findOneAndUpdate(
          { parent: sectionId, $or: [{ slug: finalSlug }, { name: displayName }] },
          {
            $set: {
              name: displayName,
              description: `${displayName} in ${sectionName}`,
              featured: false,
              productType,
              parent: sectionId,
              sizeProfile: sizeProfileId || undefined,
              filterConfig: filterConfigId || undefined
            },
            $setOnInsert: { slug: finalSlug }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`  ✓ ${subcategorySlug}${sizeProfileId ? ' ✓' : ' ?'}${filterConfigId ? ' ✓' : ' ?'}`);
        subcategoryCount++;
      }
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   ${Object.keys(topLevelMap).length} top-level categories (Men, Women, Kids, Sale, Accessories)`);
  console.log(`   ${Object.keys(sectionMap).length} section categories (Clothing, Footwear, etc.)`);
  console.log(`   ${subcategoryCount} subcategories (T-Shirts, Shoes, etc.)`);
  console.log(`   Total: ${Object.keys(topLevelMap).length + Object.keys(sectionMap).length + subcategoryCount} categories\n`);

  // Verify linkage
  console.log('✅ Verification:');
  console.log(`   SizeProfiles linked: ${Object.keys(sizeProfileMap).length} found`);
  console.log(`   CategoryFilterConfigs linked: ${Object.keys(configMap).length} found`);
  console.log(`   Unlinked configs will be linked automatically from existing data\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
