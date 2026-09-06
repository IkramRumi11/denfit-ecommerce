const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

async function testVariantOrder() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  // Find Vetiver Imperial
  const product = await Product.findOne({ name: /Vetiver Imperial/i });
  if (!product) {
    console.error('Vetiver Imperial not found!');
    process.exit(1);
  }

  console.log('Product Found:', product.name, 'ID:', product._id);
  console.log('Sizes on product:', JSON.stringify(product.sizes, null, 2));

  // Import our variant price helper
  const { getVariantPrice } = await import('../utils/variantPriceHelper.js');

  const price50 = getVariantPrice(product, { size: '50 ml' });
  const price100 = getVariantPrice(product, { size: '100 ml' });
  const price200 = getVariantPrice(product, { size: '200 ml' });

  console.log('Resolved Variant Prices:');
  console.log('50 ml =>', price50, '(Expected: 145)');
  console.log('100 ml =>', price100, '(Expected: 240)');
  console.log('200 ml =>', price200, '(Expected: 390)');

  if (price50 !== 145 || price100 !== 240 || price200 !== 390) {
    console.error('Price mismatch in helper resolution!');
    process.exit(1);
  }

  // Now create a test order in MongoDB mimicking orderController
  const orderNumber = `TEST-${Date.now().toString(36).toUpperCase()}`;
  const testItems = [
    {
      product: product._id,
      name: product.name,
      size: '100 ml',
      quantity: 1,
      price: price100,
      image: product.images?.[0] || 'placeholder.jpg'
    },
    {
      product: product._id,
      name: product.name,
      size: '200 ml',
      quantity: 1,
      price: price200,
      image: product.images?.[0] || 'placeholder.jpg'
    }
  ];

  const subtotal = testItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const total = subtotal + 300;

  const testOrder = await Order.create({
    orderNumber,
    items: testItems,
    subtotal,
    shippingPrice: 300,
    total,
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    shippingAddress: {
      fullName: 'Variant Test User',
      email: 'variant-test@example.com',
      phone: '03001234567',
      address: 'Test Address',
      city: 'Lahore'
    }
  });

  console.log('✓ Successfully created test order with distinct variant prices:');
  console.log('Order ID:', testOrder._id);
  console.log('Order Number:', testOrder.orderNumber);
  console.log('Order Subtotal:', testOrder.subtotal, '(Expected: 630)');
  console.log('Order Items:');
  testOrder.items.forEach(it => {
    console.log(` - ${it.name} | Size: ${it.size} | Price: Rs. ${it.price} | Qty: ${it.quantity}`);
  });

  process.exit(0);
}

testVariantOrder().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
