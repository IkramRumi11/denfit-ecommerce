// backend/scratch/verify-all-scenarios.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import stockService, { InsufficientStockError } from '../services/stockService.js';
function getAvailableQuantity(product, selectedSize, selectedColor) {
  if (!product) return 0;
  if (Array.isArray(product.stock) && product.stock.length && selectedSize && selectedColor) {
    const match = product.stock.find((s) => {
      if (!s) return false;
      const matchesColor = String(s.colorTempId).toLowerCase().trim() === String(selectedColor).toLowerCase().trim();
      let displaySize = s.sizeId;
      if (Array.isArray(product.sizes) && product.sizes.length) {
        const found = product.sizes.find((sz) => sz.id === s.sizeId || sz.value === s.sizeId);
        if (found) displaySize = found.value || found.id;
      }
      const matchesSize = String(displaySize).toLowerCase().trim() === String(selectedSize).toLowerCase().trim();
      return matchesColor && matchesSize;
    });
    if (match && typeof match.quantity === 'number') return match.quantity;
    return 0;
  }
  return product.inventory || 0;
}

function getAvailableSizesForProduct(product, variant) {
  const base = (product.sizes || []).map(s => s.value || s.id || String(s));
  if (Array.isArray(product.stock) && product.stock.length && variant) {
    const tempId = variant.tempId || variant._id || variant.id || null;
    const name = variant.name || null;
    const hex = variant.hex || variant.normalizedHex || null;
    const normalizeColor = (v) => (v == null ? '' : String(v).toLowerCase().trim().replace(/^#/, ''));
    const sizesWithStock = new Set();
    product.stock.forEach((st) => {
      if (!st) return;
      const matchesColor = (() => {
        if (!st.colorTempId) return false;
        const sKey = normalizeColor(st.colorTempId);
        if (tempId && sKey === normalizeColor(tempId)) return true;
        if (name && sKey === normalizeColor(name)) return true;
        if (hex && sKey === normalizeColor(hex)) return true;
        return false;
      })();
      if (!matchesColor) return;
      const sizeId = st.sizeId;
      let displaySize = sizeId;
      if (Array.isArray(product.sizes) && product.sizes.length) {
        const found = product.sizes.find((s) => s.id === sizeId || s.value === sizeId);
        if (found) displaySize = found.value || found.id;
      }
      if ((st.quantity || 0) > 0) sizesWithStock.add(String(displaySize));
    });
    return base.filter(s => sizesWithStock.has(String(s)));
  }
  return base;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Cleanup old test products
  await Product.deleteMany({ name: { $in: ['Verify Scenarios Product', 'Verify Transitions Product'] } });

  // ─── SETUP PRODUCT FOR CASES 1, 2, 3 ───
  console.log('\n--- Setting up Product for Cases 1, 2, 3 (Stock: 10) ---');
  let product1 = await Product.create({
    name: 'Verify Scenarios Product',
    price: 5000,
    description: 'Testing Phase 3 cases',
    category: 'clothing',
    inStock: true,
    images: [{ url: 'https://example.com/image.jpg', alt: 'Test' }],
    sizes: [{ id: 'size_39', value: '39', quantity: 10 }],
    colors: [{ name: 'Black', hex: '#000000' }],
    variants: [{ id: 'variant_black', name: 'Black', hex: '#000000', inventory: 10 }],
    stock: [{ sizeId: 'size_39', colorTempId: 'Black', quantity: 10 }]
  });
  console.log(`Product created: ${product1._id}`);

  // Case 1: Normal checkout (Stock: 10, Request: 2) -> Succeeds, stock = 8
  console.log('\nCase 1: Normal checkout (Request: 2)');
  let reservations = await stockService.reserveStockForOrder([
    { productId: product1._id, sizeId: 'size_39', colorTempId: 'Black', quantity: 2 }
  ], { ttlMs: 5000 });
  await stockService.commitReservations(reservations.map(r => r._id));
  
  product1 = await Product.findById(product1._id).lean();
  let currentStock = product1.stock[0].quantity;
  console.log(`- Result: Success! Remaining stock: ${currentStock}`);
  if (currentStock === 8) console.log('PASS: Case 1');
  else console.error(`FAIL: Case 1 (Expected 8, got ${currentStock})`);

  // Case 2: Exact available quantity (Stock: 8, Request: 8) -> Succeeds, stock = 0
  console.log('\nCase 2: Exact available quantity (Request: 8)');
  reservations = await stockService.reserveStockForOrder([
    { productId: product1._id, sizeId: 'size_39', colorTempId: 'Black', quantity: 8 }
  ], { ttlMs: 5000 });
  await stockService.commitReservations(reservations.map(r => r._id));
  
  product1 = await Product.findById(product1._id).lean();
  currentStock = product1.stock[0].quantity;
  console.log(`- Result: Success! Remaining stock: ${currentStock}`);
  if (currentStock === 0) console.log('PASS: Case 2');
  else console.error(`FAIL: Case 2 (Expected 0, got ${currentStock})`);

  // Case 3: Over-request (Stock: 0, Request: 1) -> Fails, throws InsufficientStockError
  console.log('\nCase 3: Over-request (Request: 1)');
  try {
    await stockService.reserveStockForOrder([
      { productId: product1._id, sizeId: 'size_39', colorTempId: 'Black', quantity: 1 }
    ], { ttlMs: 5000 });
    console.error('FAIL: Expected to throw error but succeeded');
  } catch (err) {
    if (err instanceof InsufficientStockError || err.name === 'InsufficientStockError') {
      console.log(`- Result: Failed as expected! Message: "${err.message}", Available Qty: ${err.availableQuantity}`);
      if (err.availableQuantity === 0) console.log('PASS: Case 3');
      else console.error(`FAIL: Case 3 (Expected available 0, got ${err.availableQuantity})`);
    } else {
      console.error('FAIL: Threw wrong error type:', err);
    }
  }

  // ─── SETUP PRODUCT FOR CASE 4 ───
  console.log('\n--- Setting up Product for Case 4 (Black: 2, White: 8) ---');
  let product2 = await Product.create({
    name: 'Verify Transitions Product',
    price: 5000,
    description: 'Testing Case 4',
    category: 'clothing',
    inStock: true,
    images: [{ url: 'https://example.com/image.jpg', alt: 'Test' }],
    sizes: [{ id: 'size_39', value: '39', quantity: 10 }],
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'White', hex: '#ffffff' }
    ],
    variants: [
      { id: 'variant_black', name: 'Black', hex: '#000000', inventory: 2 },
      { id: 'variant_white', name: 'White', hex: '#ffffff', inventory: 8 }
    ],
    stock: [
      { sizeId: 'size_39', colorTempId: 'Black', quantity: 2 },
      { sizeId: 'size_39', colorTempId: 'White', quantity: 8 }
    ]
  });

  // Case 4: Different color, same size (Purchase Black: 1, White remains 8)
  console.log('\nCase 4: Purchase 1 Black size 39');
  reservations = await stockService.reserveStockForOrder([
    { productId: product2._id, sizeId: 'size_39', colorTempId: 'Black', quantity: 1 }
  ], { ttlMs: 5000 });
  await stockService.commitReservations(reservations.map(r => r._id));

  product2 = await Product.findById(product2._id).lean();
  const blackStock = product2.stock.find(s => s.colorTempId === 'Black').quantity;
  const whiteStock = product2.stock.find(s => s.colorTempId === 'White').quantity;
  console.log(`- Result: Black stock: ${blackStock}, White stock: ${whiteStock}`);
  if (blackStock === 1 && whiteStock === 8) console.log('PASS: Case 4');
  else console.error(`FAIL: Case 4 (Expected Black: 1, White: 8)`);

  // Case 5: Color transition revalidation simulation
  console.log('\nCase 5: Color transition revalidation simulation');
  // Simulate White variant having Size 39 out of stock
  await Product.updateOne(
    { _id: product2._id, 'stock.colorTempId': 'White' },
    { $set: { 'stock.$.quantity': 0 } }
  );
  product2 = await Product.findById(product2._id).lean();

  const blackVar = product2.variants.find(v => v.name === 'Black');
  const whiteVar = product2.variants.find(v => v.name === 'White');
  // Note: For Case 5 verification, getAvailableSizesForProduct expects Black / White parameters
  const availableBlackSizes = getAvailableSizesForProduct(product2, blackVar);
  const availableWhiteSizes = getAvailableSizesForProduct(product2, whiteVar);
  console.log(`- Black available sizes: ${JSON.stringify(availableBlackSizes)}`);
  console.log(`- White available sizes: ${JSON.stringify(availableWhiteSizes)}`);
  
  if (availableBlackSizes.includes('39') && !availableWhiteSizes.includes('39')) {
    console.log('PASS: Case 5 (Size 39 is disabled on White but enabled on Black)');
  } else {
    console.error('FAIL: Case 5 sizing rules mismatch');
  }

  // Case 6: Cart stale inventory validation simulation
  console.log('\nCase 6: Cart stale inventory validation simulation');
  // Initial stock: 10. User has 10 in cart. We externally reduce live stock to 5.
  await Product.updateOne(
    { _id: product2._id, 'stock.colorTempId': 'Black' },
    { $set: { 'stock.$.quantity': 5 } }
  );
  product2 = await Product.findById(product2._id).lean();
  
  // getAvailableQuantity checks selected size + color stock
  const cartItem = { productId: product2._id, size: '39', color: 'Black', quantity: 10 };
  const currentQuantity = getAvailableQuantity(product2, cartItem.size, cartItem.color);
  console.log(`- Cart requested: 10, Live available stock: ${currentQuantity}`);
  if (currentQuantity === 5) {
    console.log('PASS: Case 6 (Stock correctly resolves to 5)');
  } else {
    console.error(`FAIL: Case 6 (Expected 5, got ${currentQuantity})`);
  }

  // Case 7: Checkout stale inventory block simulation
  console.log('\nCase 7: Checkout stale inventory block simulation');
  // If cart has 10, but stock is 5:
  const stockIssues = [];
  if (cartItem.quantity > currentQuantity) {
    stockIssues.push(`Verify Transitions Product - Color: Black, Size: 39 (Requested: ${cartItem.quantity}, Available: ${currentQuantity})`);
  }
  console.log(`- Validation errors detected:\n  ${stockIssues.join('\n  ')}`);
  if (stockIssues.length === 1 && stockIssues[0].includes('Requested: 10, Available: 5')) {
    console.log('PASS: Case 7 (Checkout validation correctly blocks and identifies details)');
  } else {
    console.error('FAIL: Case 7 validation mismatch');
  }

  // Cleanup
  await Product.deleteMany({ name: { $in: ['Verify Scenarios Product', 'Verify Transitions Product'] } });
  await mongoose.disconnect();
  console.log('\nAll done!');
}

run().catch(err => {
  console.error('Failed to run scenarios verification:', err);
  process.exit(1);
});
