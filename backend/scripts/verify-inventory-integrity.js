// backend/scripts/verify-inventory-integrity.js
import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

import Product from '../models/Product.js';

dotenv.config();

async function run() {
  try {
    let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';
    if (uri.includes('://mongo:')) {
      try {
        await dns.promises.lookup('mongo');
      } catch (dnsErr) {
        uri = uri.replace('://mongo:', '://127.0.0.1:');
      }
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for Integrity Check.");

    const shouldFix = process.argv.some(arg => arg.includes('fix')) || process.env.npm_config_fix === 'true' || process.env.npm_config_fix === '1';
    if (shouldFix) {
      console.log("Repair Mode (--fix) is ENABLED. Will fix inconsistencies automatically.");
    }

    const products = await Product.find({});
    console.log(`Scanned ${products.length} products total.`);

    let inconsistentCount = 0;
    let fixedCount = 0;
    const reports = [];

    for (const p of products) {
      const stock = Array.isArray(p.stock) ? p.stock : [];
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const variants = Array.isArray(p.variants) ? p.variants : [];
      
      const hasStock = stock.length > 0;
      const issues = [];

      if (hasStock) {
        // 1. Check overall inventory sum
        const expectedInventory = stock.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
        if (p.inventory !== expectedInventory) {
          issues.push(`Inventory mismatch: DB holds ${p.inventory}, stock sum is ${expectedInventory}`);
        }

        // 2. Check sizes quantities
        sizes.forEach((sz) => {
          if (!sz) return;
          const sizeStock = stock.filter((st) => st && String(st.sizeId) === String(sz.id || sz._id));
          const expectedSizeQty = sizeStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          if (sz.quantity !== expectedSizeQty) {
            issues.push(`Size "${sz.value}" quantity mismatch: DB holds ${sz.quantity}, stock sum is ${expectedSizeQty}`);
          }
          const expectedInStock = expectedSizeQty > 0;
          if (sz.inStock !== expectedInStock) {
            issues.push(`Size "${sz.value}" inStock mismatch: DB holds ${sz.inStock}, expected ${expectedInStock}`);
          }
        });

        // 3. Check variants inventory
        variants.forEach((v) => {
          if (!v) return;
          const variantStock = stock.filter((st) => {
            if (!st) return false;
            const colorId = String(st.colorTempId || '').toLowerCase().trim();
            return (
              colorId === String(v.name || '').toLowerCase().trim() ||
              colorId === String(v.hex || '').toLowerCase().trim() ||
              colorId === String(v._id || '').toLowerCase().trim() ||
              colorId === String(v.tempId || '').toLowerCase().trim()
            );
          });
          const expectedVariantQty = variantStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          if (v.inventory !== expectedVariantQty) {
            issues.push(`Variant "${v.name || v.hex || v._id}" inventory mismatch: DB holds ${v.inventory}, stock sum is ${expectedVariantQty}`);
          }
        });
      }

      // 4. Check global inStock status
      const expectedGlobalInStock = (p.inventory || 0) > 0;
      if (p.inStock !== expectedGlobalInStock) {
        issues.push(`Global inStock mismatch: DB holds ${p.inStock}, expected ${expectedGlobalInStock}`);
      }

      if (issues.length > 0) {
        inconsistentCount++;
        
        if (shouldFix) {
          try {
            // Re-derive properties and save with validation bypass
            // This triggers pre-save syncProduct hook
            await p.save({ validateBeforeSave: false });
            fixedCount++;
            reports.push({
              productId: p._id,
              name: p.name,
              sku: p.sku,
              issues,
              fixed: true
            });
          } catch (saveErr) {
            reports.push({
              productId: p._id,
              name: p.name,
              sku: p.sku,
              issues,
              fixed: false,
              error: saveErr.message
            });
          }
        } else {
          reports.push({
            productId: p._id,
            name: p.name,
            sku: p.sku,
            issues,
            fixed: false
          });
        }
      }
    }

    console.log("=========================================");
    console.log("INVENTORY INTEGRITY REPORT");
    console.log(`Total Products Checked: ${products.length}`);
    console.log(`Consistent Products:   ${products.length - inconsistentCount}`);
    console.log(`Inconsistent Products: ${inconsistentCount}`);
    if (shouldFix) {
      console.log(`Successfully Repaired: ${fixedCount}`);
      console.log(`Failed to Repair:      ${inconsistentCount - fixedCount}`);
    }
    console.log("=========================================");

    if (reports.length > 0) {
      console.log("\nDETAILED INCONSISTENCIES FOUND:");
      reports.forEach((rep) => {
        const fixStatus = rep.fixed ? " [✓ REPAIRED]" : rep.error ? ` [❌ FAILED: ${rep.error}]` : "";
        console.log(`\nProduct: ${rep.name} (${rep.sku || 'No SKU'})${fixStatus} - ID: ${rep.productId}`);
        rep.issues.forEach(issue => console.log(`  - ${issue}`));
      });
    } else {
      console.log("\nAll product inventories are perfectly consistent!");
    }
    console.log("=========================================");
  } catch (err) {
    console.error("Integrity check failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
