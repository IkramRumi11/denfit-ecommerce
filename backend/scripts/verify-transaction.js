import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { supportsTransactions } from '../utils/dbUtils.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit_dev';

const run = async () => {
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const txOk = await supportsTransactions();
  console.log('supportsTransactions():', txOk);

  if (!txOk) {
    console.warn('Transactions not supported; ensure replica set is initialized and the DB was started with --replSet');
    process.exit(txOk ? 0 : 2);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const Test = mongoose.connection.collection('tx_test_collection');
      console.log('In transaction: inserting test doc');
      await Test.insertOne({ createdAt: new Date(), marker: 'tx-test' }, { session });
      console.log('Inserted in transaction; throwing to force abort');
      throw new Error('force-abort');
    });
  } catch (e) {
    console.log('Transaction aborted as expected:', e.message);
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }

  console.log('Verify script finished.');
};

run().catch(err => { console.error(err); process.exit(1); });
