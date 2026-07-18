/**
 * Migration Script: Rename "collection" field to "collectionName" in Product schema
 * 
 * REASON FOR MIGRATION:
 * The field name "collection" is reserved in Mongoose and triggers warnings during schema creation.
 * This migration renames existing products' "collection" field to "collectionName" while maintaining
 * all functionality and backward compatibility through the collectionSlug field.
 * 
 * EXECUTION:
 * node scripts/migrate-collection-to-collectionName.mjs
 * 
 * ROLLBACK:
 * If needed, revert by running:
 * node scripts/migrate-collectionName-to-collection.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

async function migrate() {
  try {
    console.log('[MIGRATION] Starting collection → collectionName migration...\n');

    // Connect to MongoDB
    console.log('[MIGRATION] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce', {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000
    });
    console.log('[MIGRATION] ✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Step 1: Check how many products have the "collection" field
    console.log('[MIGRATION] Analyzing existing products...');
    const collectionName = 'products';
    
    const totalCount = await db.collection(collectionName).countDocuments({});
    const productsWithCollectionField = await db.collection(collectionName).countDocuments({
      collection: { $exists: true, $ne: null }
    });
    const productsWithCollectionNameField = await db.collection(collectionName).countDocuments({
      collectionName: { $exists: true, $ne: null }
    });

    console.log(`   • Total products: ${totalCount}`);
    console.log(`   • Products with "collection" field: ${productsWithCollectionField}`);
    console.log(`   • Products with "collectionName" field (already migrated): ${productsWithCollectionNameField}\n`);

    if (productsWithCollectionField === 0) {
      console.log('[MIGRATION] ✅ No products need migration. All products already use "collectionName" or don\'t have this field.');
      await mongoose.connection.close();
      return;
    }

    // Step 2: Perform the rename operation
    console.log(`[MIGRATION] Renaming "collection" → "collectionName" for ${productsWithCollectionField} products...`);
    
    const result = await db.collection(collectionName).updateMany(
      {
        collection: { $exists: true, $ne: null }
      },
      [
        {
          $set: {
            collectionName: '$collection'
          }
        },
        {
          $unset: ['collection']
        }
      ]
    );

    console.log(`[MIGRATION] ✅ Rename operation completed:`);
    console.log(`   • Documents matched: ${result.matchedCount}`);
    console.log(`   • Documents modified: ${result.modifiedCount}\n`);

    // Step 3: Verify the migration
    console.log('[MIGRATION] Verifying migration...');
    const verifyOldFieldRemaining = await db.collection(collectionName).countDocuments({
      collection: { $exists: true }
    });
    const verifyNewFieldPresent = await db.collection(collectionName).countDocuments({
      collectionName: { $exists: true, $ne: null }
    });

    console.log(`   • Products still with "collection" field: ${verifyOldFieldRemaining}`);
    console.log(`   • Products now with "collectionName" field: ${verifyNewFieldPresent}\n`);

    if (verifyOldFieldRemaining === 0) {
      console.log('[MIGRATION] ✅ Migration SUCCESSFUL! All old "collection" fields have been removed.');
    } else {
      console.log('[MIGRATION] ⚠️  WARNING: Some products still have the old "collection" field.');
    }

    // Step 4: Sample check
    console.log('\n[MIGRATION] Sampling migrated products (first 3):');
    const samples = await db.collection(collectionName)
      .find({ collectionName: { $exists: true } })
      .limit(3)
      .toArray();

    samples.forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.name}`);
      console.log(`      • collectionName: ${product.collectionName || 'N/A'}`);
      console.log(`      • collectionSlug: ${product.collectionSlug || 'N/A'}`);
    });

    console.log('\n[MIGRATION] ✅ Migration completed successfully!');

  } catch (error) {
    console.error('[MIGRATION] ❌ Migration failed:', error && error.message ? error.message : error);
    process.exit(1);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('[MIGRATION] MongoDB connection closed');
    } catch (e) {
      // ignore
    }
    process.exit(0);
  }
}

// Execute migration
migrate();
