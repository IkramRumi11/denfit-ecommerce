// backend/scratch/verify-phase2.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import StockReservation from '../models/StockReservation.js';
import { createOrder, cancelOrder } from '../controllers/orderController.js';
import { updateOrderStatus, refundOrder, cancelOrder as adminCancelOrder } from '../controllers/adminController.js';

dotenv.config();
process.env.USE_STOCK_AS_SOURCE_OF_TRUTH = 'true';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/denfit-ecommerce';

const validShippingAddress = {
  name: 'John Doe',
  street: '123 Test Street Karachi Pakistan',
  city: 'Karachi',
  state: 'Sindh',
  zipCode: '74200',
  country: 'Pakistan',
  phone: '03001234567',
  email: 'john.doe@example.com'
};

// Helper mock response
function createMockRes() {
  let resStatus = 0;
  let resJson = null;
  return {
    status: function (code) {
      resStatus = code;
      return this;
    },
    json: function (data) {
      resJson = data;
      return this;
    },
    getStatus: () => resStatus,
    getJson: () => resJson
  };
}

async function setupTestProduct(sku, blackQty = 2, whiteQty = 8) {
  const data = {
    name: `Test Product ${sku}`,
    description: 'Testing inventory restoration',
    price: 1000,
    category: 'footwear',
    gender: 'unisex',
    sku: sku,
    images: [{ url: 'https://via.placeholder.com/150', isPrimary: true }],
    variants: [
      { name: 'Black', hex: '#000000', availableSizes: ['39', '40'], inventory: blackQty },
      { name: 'White', hex: '#ffffff', availableSizes: ['39', '40'], inventory: whiteQty }
    ],
    colors: [
      { name: 'Black', hex: '#000000', value: '#000000', normalizedHex: '#000000' },
      { name: 'White', hex: '#ffffff', value: '#ffffff', normalizedHex: '#ffffff' }
    ],
    sizes: [
      { id: 'size_39', value: '39', inStock: true, quantity: null },
      { id: 'size_40', value: '40', inStock: true, quantity: null }
    ],
    stock: [
      { colorTempId: 'Black', sizeId: 'size_39', quantity: blackQty },
      { colorTempId: 'White', sizeId: 'size_40', quantity: whiteQty }
    ],
    inventory: blackQty + whiteQty,
    inStock: true
  };
  return await Product.create(data);
}

async function run() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully!');

  // Pre-cleanup
  await Product.deleteMany({ sku: { $in: ['SKU-CASE1', 'SKU-CASE2', 'SKU-CASE3', 'SKU-CASE4', 'SKU-CASE5-A', 'SKU-CASE5-B'] } });

  // -------------------------------------------------------------
  // Case 1: Standard Reversion (User Cancellation)
  // -------------------------------------------------------------
  console.log('\n--- CASE 1: Standard Reversion ---');
  const p1 = await setupTestProduct('SKU-CASE1', 2, 8);
  const req1 = {
    body: {
      items: [{ productId: p1._id.toString(), size: '39', color: '#000000', colorName: 'Black', quantity: 1 }],
      shippingAddress: validShippingAddress,
      paymentMethod: 'cash_on_delivery'
    },
    user: null
  };
  const res1 = createMockRes();
  await createOrder(req1, res1);
  const res1Json = res1.getJson();
  console.log('Case 1 CreateOrder Response Status:', res1.getStatus(), 'Body:', res1Json);
  if (res1.getStatus() !== 201) {
    throw new Error(`Order creation failed: ${JSON.stringify(res1Json)}`);
  }
  const order1 = res1Json.data.order;

  // Verify stock is 1
  let updatedP1 = await Product.findById(p1._id);
  let blackStock1 = updatedP1.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after purchase (expecting 1):', blackStock1.quantity);
  if (blackStock1.quantity !== 1) throw new Error('Purchase decrement failed');

  // Cancel order (User Cancellation)
  const cancelReq1 = { params: { id: order1._id.toString() }, user: { id: 'dummy-user-id' } };
  const cancelRes1 = createMockRes();
  // Mock finding order with customer filter for cancelOrder controller
  const originalFindOne = Order.findOne;
  Order.findOne = () => ({
    _id: order1._id,
    status: order1.status,
    save: async function () {
      this.status = 'cancelled';
      await Order.findByIdAndUpdate(this._id, { status: 'cancelled' });
      return this;
    }
  });

  await cancelOrder(cancelReq1, cancelRes1);
  Order.findOne = originalFindOne; // Restore

  updatedP1 = await Product.findById(p1._id);
  blackStock1 = updatedP1.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after cancellation (expecting 2):', blackStock1.quantity);
  if (blackStock1.quantity !== 2) throw new Error('Cancellation restore failed');
  console.log('✅ Case 1 Passed!');

  // -------------------------------------------------------------
  // Case 2: Idempotent Double Cancellation
  // -------------------------------------------------------------
  console.log('\n--- CASE 2: Idempotent Double Cancellation ---');
  const p2 = await setupTestProduct('SKU-CASE2', 2, 8);
  const req2 = {
    body: {
      items: [{ productId: p2._id.toString(), size: '39', color: '#000000', colorName: 'Black', quantity: 1 }],
      shippingAddress: validShippingAddress,
      paymentMethod: 'cash_on_delivery'
    },
    user: null
  };
  const res2 = createMockRes();
  await createOrder(req2, res2);
  const res2Json = res2.getJson();
  if (res2.getStatus() !== 201) throw new Error(`Order creation failed: ${JSON.stringify(res2Json)}`);
  const order2 = res2Json.data.order;

  // Cancel once (Admin Cancellation)
  const cancelReq2_1 = { params: { id: order2._id.toString() }, body: { reason: 'Test cancel 1' }, user: { _id: new mongoose.Types.ObjectId(), name: 'Admin' } };
  const cancelRes2_1 = createMockRes();
  await adminCancelOrder(cancelReq2_1, cancelRes2_1);

  let updatedP2 = await Product.findById(p2._id);
  let blackStock2 = updatedP2.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after first cancellation (expecting 2):', blackStock2.quantity);
  if (blackStock2.quantity !== 2) throw new Error('First cancel restore failed');

  // Cancel again (Admin Cancellation)
  const cancelRes2_2 = createMockRes();
  await adminCancelOrder(cancelReq2_1, cancelRes2_2);

  updatedP2 = await Product.findById(p2._id);
  blackStock2 = updatedP2.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after second cancellation (expecting 2):', blackStock2.quantity);
  if (blackStock2.quantity !== 2) throw new Error('Second cancel double-incremented stock!');
  console.log('✅ Case 2 Passed!');

  // -------------------------------------------------------------
  // Case 3: Refund Isolation (No Stock Reversion)
  // -------------------------------------------------------------
  console.log('\n--- CASE 3: Refund Isolation ---');
  const p3 = await setupTestProduct('SKU-CASE3', 2, 8);
  const req3 = {
    body: {
      items: [{ productId: p3._id.toString(), size: '39', color: '#000000', colorName: 'Black', quantity: 1 }],
      shippingAddress: validShippingAddress,
      paymentMethod: 'cash_on_delivery'
    },
    user: null
  };
  const res3 = createMockRes();
  await createOrder(req3, res3);
  const res3Json = res3.getJson();
  if (res3.getStatus() !== 201) throw new Error(`Order creation failed: ${JSON.stringify(res3Json)}`);
  const order3 = res3Json.data.order;

  // Refund Order (Admin Refund)
  const refundReq = { params: { id: order3._id.toString() }, body: { amount: 1000, reason: 'Refunding customer' }, user: { _id: new mongoose.Types.ObjectId(), name: 'Admin' } };
  const refundRes = createMockRes();
  await refundOrder(refundReq, refundRes);

  let updatedP3 = await Product.findById(p3._id);
  let blackStock3 = updatedP3.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after refund (expecting 1):', blackStock3.quantity);
  if (blackStock3.quantity !== 1) throw new Error('Refund mistakenly restored inventory!');
  console.log('✅ Case 3 Passed!');

  // -------------------------------------------------------------
  // Case 4: Status Transition Isolation (Pending -> Processing)
  // -------------------------------------------------------------
  console.log('\n--- CASE 4: Status Transition Isolation ---');
  const p4 = await setupTestProduct('SKU-CASE4', 2, 8);
  const req4 = {
    body: {
      items: [{ productId: p4._id.toString(), size: '39', color: '#000000', colorName: 'Black', quantity: 1 }],
      shippingAddress: validShippingAddress,
      paymentMethod: 'cash_on_delivery'
    },
    user: null
  };
  const res4 = createMockRes();
  await createOrder(req4, res4);
  const res4Json = res4.getJson();
  if (res4.getStatus() !== 201) throw new Error(`Order creation failed: ${JSON.stringify(res4Json)}`);
  const order4 = res4Json.data.order;

  // Transition from pending to processing (Admin updateOrderStatus)
  const statusReq = { params: { id: order4._id.toString() }, body: { status: 'processing', note: 'Status change' }, user: { _id: new mongoose.Types.ObjectId(), name: 'Admin' } };
  const statusRes = createMockRes();
  await updateOrderStatus(statusReq, statusRes);

  let updatedP4 = await Product.findById(p4._id);
  let blackStock4 = updatedP4.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  console.log('Stock after transition to processing (expecting 1):', blackStock4.quantity);
  if (blackStock4.quantity !== 1) throw new Error('Transition to processing mistakenly restored inventory!');
  console.log('✅ Case 4 Passed!');

  // -------------------------------------------------------------
  // Case 5: Multiple-item Order Reversion
  // -------------------------------------------------------------
  console.log('\n--- CASE 5: Multiple-item Order Reversion ---');
  const p5A = await setupTestProduct('SKU-CASE5-A', 2, 8);
  const p5B = await setupTestProduct('SKU-CASE5-B', 5, 5);
  // Configure p5B to have White Size 40 stock
  p5B.stock = [{ colorTempId: 'White', sizeId: 'size_40', quantity: 5 }];
  await p5B.save();

  const req5 = {
    body: {
      items: [
        { productId: p5A._id.toString(), size: '39', color: '#000000', colorName: 'Black', quantity: 1 },
        { productId: p5B._id.toString(), size: '40', color: '#ffffff', colorName: 'White', quantity: 2 }
      ],
      shippingAddress: validShippingAddress,
      paymentMethod: 'cash_on_delivery'
    },
    user: null
  };
  const res5 = createMockRes();
  await createOrder(req5, res5);
  const res5Json = res5.getJson();
  if (res5.getStatus() !== 201) throw new Error(`Order creation failed: ${JSON.stringify(res5Json)}`);
  const order5 = res5Json.data.order;

  // Verify stock levels drop
  let updatedP5A = await Product.findById(p5A._id);
  let updatedP5B = await Product.findById(p5B._id);
  let stock5A = updatedP5A.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  let stock5B = updatedP5B.stock.find(s => s.colorTempId === 'White' && s.sizeId === 'size_40');
  console.log('P5A Stock after purchase (expecting 1):', stock5A.quantity);
  console.log('P5B Stock after purchase (expecting 3):', stock5B.quantity);
  if (stock5A.quantity !== 1 || stock5B.quantity !== 3) throw new Error('Multi-item purchase decrement failed');

  // Cancel order (Admin Cancellation)
  const cancelReq5 = { params: { id: order5._id.toString() }, body: { reason: 'Test cancel multi' }, user: { _id: new mongoose.Types.ObjectId(), name: 'Admin' } };
  const cancelRes5 = createMockRes();
  await adminCancelOrder(cancelReq5, cancelRes5);

  // Verify stock levels restore
  updatedP5A = await Product.findById(p5A._id);
  updatedP5B = await Product.findById(p5B._id);
  stock5A = updatedP5A.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  stock5B = updatedP5B.stock.find(s => s.colorTempId === 'White' && s.sizeId === 'size_40');
  console.log('P5A Stock after cancel (expecting 2):', stock5A.quantity);
  console.log('P5B Stock after cancel (expecting 5):', stock5B.quantity);
  if (stock5A.quantity !== 2 || stock5B.quantity !== 5) throw new Error('Multi-item cancel restore failed');

  // Verify reservations are released
  const reservations5 = await StockReservation.find({ order: order5._id });
  console.log('Multi-item reservations status (expecting all released):', reservations5.map(r => r.status));
  if (reservations5.some(r => r.status !== 'released')) throw new Error('Some multi-item reservations were not released');
  console.log('✅ Case 5 Passed!');

  // Cleanup
  await Product.deleteMany({ sku: { $in: ['SKU-CASE1', 'SKU-CASE2', 'SKU-CASE3', 'SKU-CASE4', 'SKU-CASE5-A', 'SKU-CASE5-B'] } });
  await Order.deleteMany({ _id: { $in: [order1._id, order2._id, order3._id, order4._id, order5._id] } });
  await StockReservation.deleteMany({ order: { $in: [order1._id, order2._id, order3._id, order4._id, order5._id] } });
  console.log('\nAll cleanups completed successfully!');
  await mongoose.disconnect();
}

run()
  .then(() => {
    console.log('\n\x1b[32m%s\x1b[0m', '🎉 ALL 5 CASES PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ VERIFICATION FAILED:', err);
    process.exit(1);
  });
