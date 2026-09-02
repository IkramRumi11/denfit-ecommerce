import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: User } = await import('../models/User.js');

  // admin@denfit.com — ensure unlocked, verified, correct password
  let admin = await User.findOne({ email: 'admin@denfit.com' });
  if (!admin) {
    admin = new User({
      name: 'Test Admin',
      email: 'admin@denfit.com',
      role: 'admin',
    });
  }
  admin.password = 'TestAdmin123!';
  admin.emailVerified = true;
  admin.active = true;
  admin.deleted = false;
  admin.loginAttempts = 0;
  admin.lockUntil = undefined;
  admin.role = 'admin';
  await admin.save();
  console.log('✅ Admin admin@denfit.com seeded: password=TestAdmin123!, emailVerified=true, active=true');

  // test@example.com — ensure unlocked, verified, correct password
  let customer = await User.findOne({ email: 'test@example.com' });
  if (!customer) {
    customer = new User({
      name: 'Test Customer',
      email: 'test@example.com',
      role: 'customer',
    });
  }
  customer.password = 'password123';
  customer.emailVerified = true;
  customer.active = true;
  customer.deleted = false;
  customer.loginAttempts = 0;
  customer.lockUntil = undefined;
  await customer.save();
  console.log('✅ Customer test@example.com seeded: password=password123, emailVerified=true, active=true');

  process.exit(0);
} catch (err) {
  console.error('Check failed:', err);
  process.exit(1);
}