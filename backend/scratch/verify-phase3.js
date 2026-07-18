// backend/scratch/verify-phase3.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import stockService, { InsufficientStockError } from '../services/stockService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Cleanup old test products
  await Product.deleteMany({ name: 'Verify Phase 3 Test Product' });

  // Create a clean test product
  const product = await Product.create({
    name: 'Verify Phase 3 Test Product',
    price: 5000,
    description: 'Testing Phase 3 stock validation',
    category: 'clothing',
    inStock: true,
    images: [
      { url: 'https://example.com/image.jpg', alt: 'Test' }
    ],
    sizes: [
      { id: 'size_39', value: '39', quantity: 1 }
    ],
    colors: [
      { name: 'Black', hex: '#000000' }
    ],
    variants: [
      { id: 'variant_black', name: 'Black', hex: '#000000', inventory: 1 }
    ],
    stock: [
      {
        sizeId: 'size_39',
        colorTempId: 'Black',
        quantity: 1
      }
    ]
  });

  console.log(`Created test product with ID: ${product._id}`);

  // Test Case 1: Reserve more than available stock
  console.log('\n--- Test Case 1: Requesting 2 units (Available: 1) ---');
  try {
    await stockService.reserveStockForOrder([
      {
        productId: product._id,
        sizeId: 'size_39',
        colorTempId: 'Black',
        quantity: 2
      }
    ], { ttlMs: 1000 });
    console.error('FAIL: Expected reserveStockForOrder to throw InsufficientStockError but it succeeded.');
  } catch (err) {
    if (err instanceof InsufficientStockError || err.name === 'InsufficientStockError') {
      console.log('PASS: Threw InsufficientStockError successfully!');
      console.log('Error properties:');
      console.log(`- name: ${err.name}`);
      console.log(`- productId: ${err.productId}`);
      console.log(`- sizeId: ${err.sizeId}`);
      console.log(`- colorTempId: ${err.colorTempId}`);
      console.log(`- availableQuantity: ${err.availableQuantity}`);

      // Verify structure checks
      if (
        String(err.productId) === String(product._id) &&
        err.sizeId === 'size_39' &&
        err.colorTempId === 'Black' &&
        err.availableQuantity === 1
      ) {
        console.log('PASS: Error metadata properties are completely correct!');
      } else {
        console.error('FAIL: Error metadata mismatch.');
      }
    } else {
      console.error('FAIL: Threw unexpected error:', err);
    }
  }

  // Test Case 2: Clean check response translation
  console.log('\n--- Test Case 2: Simulating Controller Response Formatting ---');
  const simulateResponse = (createErr) => {
    const dbProductMap = { [String(product._id)]: product };
    const { productId, sizeId, colorTempId, availableQuantity } = createErr;
    const dbProduct = dbProductMap[String(productId)];
    let sizeVal = sizeId;
    let colorName = colorTempId || 'Default';
    let displayMessage = `Only ${availableQuantity} items are available.`;
    
    if (dbProduct) {
      const matchedSize = dbProduct.sizes?.find(s => String(s.id) === String(sizeId) || String(s.value) === String(sizeId));
      sizeVal = matchedSize ? matchedSize.value : sizeId;
      
      const matchedVar = dbProduct.variants?.find(v => 
        String(v._id || v.id) === String(colorTempId) ||
        (v.name && String(v.name).toLowerCase() === String(colorTempId).toLowerCase())
      );
      if (matchedVar) colorName = matchedVar.name;
      
      if (availableQuantity === 0) {
        displayMessage = `${colorName} / Size ${sizeVal} is out of stock.`;
      } else {
        displayMessage = `Only ${availableQuantity} items are available for ${colorName} / Size ${sizeVal}.`;
      }
    }
    
    return {
      status: 'fail',
      code: 'INSUFFICIENT_STOCK',
      message: displayMessage,
      availableQuantity
    };
  };

  const mockError = new InsufficientStockError('Insufficient stock', {
    productId: product._id,
    sizeId: 'size_39',
    colorTempId: 'Black',
    availableQuantity: 1
  });

  const payload = simulateResponse(mockError);
  console.log('Simulated Controller JSON Output:');
  console.log(JSON.stringify(payload, null, 2));

  if (
    payload.status === 'fail' &&
    payload.code === 'INSUFFICIENT_STOCK' &&
    payload.message === 'Only 1 items are available for Black / Size 39.' &&
    payload.availableQuantity === 1
  ) {
    console.log('PASS: Controller payload formatting matches specifications!');
  } else {
    console.error('FAIL: Controller payload formatting mismatch.');
  }

  // Cleanup
  await Product.deleteMany({ name: 'Verify Phase 3 Test Product' });
  await mongoose.connect(MONGODB_URI); // keep it open
  await mongoose.disconnect();
  console.log('\nAll done!');
}

run().catch(err => {
  console.error('Failed to run verification script:', err);
  process.exit(1);
});
