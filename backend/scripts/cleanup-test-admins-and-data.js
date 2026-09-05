import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';

async function cleanup() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  // 1. Find all admins before cleanup
  const allAdmins = await User.find({ role: 'admin' }).lean();
  console.log('Admins in DB before cleanup:');
  allAdmins.forEach(a => console.log(` - ${a.email} (${a._id})`));

  // 2. Delete all test admins and test dummy accounts
  const deleteResult = await User.deleteMany({
    $or: [
      { email: 'admin@denfit.com' },
      { email: /^testuser-.*@example\.com$/i },
      { email: /^test-.*@example\.com$/i },
      { email: /^user-.*@example\.com$/i },
      { email: 'testuser@example.com' },
      { email: 'test@example.com' },
      { email: 'wrong@example.com' }
    ]
  });

  console.log(`✅ Deleted ${deleteResult.deletedCount} test users & test admin accounts.`);

  // 3. Verify legitimate admin users
  const remainingAdmins = await User.find({ role: 'admin' }).lean();
  console.log('Verified legitimate admin accounts:');
  remainingAdmins.forEach(a => console.log(` - ${a.email} (${a._id}, verified: ${a.emailVerified})`));

  // 4. Ensure real admin is verified and active
  const owner = await User.findOne({ email: 'ikramrumi516@gmail.com' });
  if (owner) {
    owner.role = 'admin';
    owner.emailVerified = true;
    owner.isActive = true;
    owner.isLocked = false;
    await owner.save({ validateBeforeSave: false });
    console.log('✅ Confirmed owner admin active and verified: ikramrumi516@gmail.com');
  }

  await mongoose.disconnect();
  console.log('✨ Cleanup complete successfully!');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('❌ Cleanup error:', err);
  process.exit(1);
});
