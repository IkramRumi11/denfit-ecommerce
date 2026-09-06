require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function checkOrder() {
  await mongoose.connect(process.env.MONGODB_URI);
  const order = await Order.findOne().sort({ createdAt: -1 });
  if (!order) {
    console.log('No orders found');
  } else {
    console.log('LATEST ORDER:');
    console.log('Order Number:', order.orderNumber);
    console.log('Customer:', order.shippingAddress?.fullName, order.shippingAddress?.email);
    console.log('Subtotal:', order.subtotal);
    console.log('Shipping:', order.shippingPrice);
    console.log('Total:', order.total);
    console.log('Items:', JSON.stringify(order.items.map(i => ({
      name: i.name,
      size: i.size,
      price: i.price,
      quantity: i.quantity
    })), null, 2));
  }
  process.exit(0);
}

checkOrder().catch(err => {
  console.error(err);
  process.exit(1);
});
