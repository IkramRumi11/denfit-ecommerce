// backend/scratch/verify-phase1.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import StockReservation from '../models/StockReservation.js';
import { createOrder } from '../controllers/orderController.js';

dotenv.config();

// Ensure correct DB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/denfit-ecommerce';

async function run() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully!');

  // Cleanup any old test artifacts
  await Product.deleteMany({ sku: 'TEST-PHASE1-SHOE' });
  await Order.deleteMany({ 'items.name': 'Phase 1 Test Shoe' });

  // 1. Create a test product with Black and White variants, each having Size 39 stock
  const testProductData = {
    name: 'Phase 1 Test Shoe',
    description: 'Testing variant stock deduction matching',
    price: 1000,
    category: 'footwear',
    gender: 'unisex',
    sku: 'TEST-PHASE1-SHOE',
    images: [{ url: 'https://via.placeholder.com/150', isPrimary: true }],
    variants: [
      {
        name: 'Black',
        hex: '#000000',
        availableSizes: ['39', '40'],
        inventory: 2
      },
      {
        name: 'White',
        hex: '#ffffff',
        availableSizes: ['39', '40'],
        inventory: 8
      }
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
      { colorTempId: 'Black', sizeId: 'size_39', quantity: 2 },
      { colorTempId: 'White', sizeId: 'size_39', quantity: 8 }
    ],
    inventory: 10,
    inStock: true
  };

  const product = await Product.create(testProductData);
  console.log('Test product created with ID:', product._id);
  console.log('Initial stock matrix:', product.stock);

  // 2. Setup mock req and res for createOrder
  const req = {
    body: {
      items: [
        {
          productId: product._id.toString(),
          size: '39',
          color: '#000000', // HEX of Black
          colorName: 'Black',
          quantity: 1
        }
      ],
      shippingAddress: {
        name: 'John Doe',
        street: '123 Test Street Karachi Pakistan',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '74200',
        country: 'Pakistan',
        phone: '03001234567',
        email: 'john.doe@example.com'
      },
      paymentMethod: 'cash_on_delivery'
    },
    user: null // Guest checkout
  };

  let resStatus = 0;
  let resJson = null;

  const res = {
    status: function (code) {
      resStatus = code;
      return this;
    },
    json: function (data) {
      resJson = data;
      return this;
    }
  };

  console.log('Simulating order placement for 1x Black Size 39...');
  await createOrder(req, res);

  console.log('Order controller finished with HTTP status:', resStatus);
  if (resStatus !== 201) {
    console.error('Order creation failed:', resJson);
    throw new Error('Expected 201 Created');
  }

  const createdOrder = resJson.data.order;
  console.log('Order created successfully. Order Number:', createdOrder.orderNumber);

  // 3. Fetch the product again and verify the stock levels
  const updatedProduct = await Product.findById(product._id);
  console.log('Updated stock matrix:', updatedProduct.stock);
  console.log('Updated top-level inventory:', updatedProduct.inventory);
  console.log('Updated variants inventory:', updatedProduct.variants.map(v => ({ name: v.name, inventory: v.inventory })));

  const blackStock = updatedProduct.stock.find(s => s.colorTempId === 'Black' && s.sizeId === 'size_39');
  const whiteStock = updatedProduct.stock.find(s => s.colorTempId === 'White' && s.sizeId === 'size_39');

  if (!blackStock || blackStock.quantity !== 1) {
    throw new Error(`Expected Black Size 39 stock to be 1, got ${blackStock ? blackStock.quantity : 'undefined'}`);
  }

  if (!whiteStock || whiteStock.quantity !== 8) {
    throw new Error(`Expected White Size 39 stock to be 8, got ${whiteStock ? whiteStock.quantity : 'undefined'}`);
  }

  if (updatedProduct.inventory !== 9) {
    throw new Error(`Expected overall product inventory to be 9, got ${updatedProduct.inventory}`);
  }

  console.log('\x1b[32m%s\x1b[0m', '  SUCCESS: Black Size 39 stock decremented from 2 to 1.');
  console.log('\x1b[32m%s\x1b[0m', '  SUCCESS: White Size 39 stock remained unchanged at 8.');
  console.log('\x1b[32m%s\x1b[0m', '  SUCCESS: Overall product inventory correctly decremented to 9.');

  // Clean up
  await Product.findByIdAndDelete(product._id);
  await Order.findByIdAndDelete(createdOrder._id);
  await StockReservation.deleteMany({ order: createdOrder._id });
  console.log('Cleanup completed successfully.');
}

run()
  .then(() => {
    console.log('Verification finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  });
