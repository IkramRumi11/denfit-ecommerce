const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function main(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';
  try{
    await mongoose.connect(uri);
    const legacy = await mongoose.connection.db.collection('newsletters').find({}).toArray();
    console.log('Found', legacy.length, 'legacy newsletter(s)');
    for(const l of legacy){
      const email = String(l.email).toLowerCase().trim();
      const doc = {
        email,
        source: l.source || 'legacy',
        isVerified: false,
        subscribedAt: l.subscribedAt ? new Date(l.subscribedAt) : new Date(),
        status: 'active'
      };
      await mongoose.connection.db.collection('newsletterSubscribers').updateOne(
        { email },
        { $set: doc },
        { upsert: true }
      );
      console.log('Upserted', email);
    }
    const after = await mongoose.connection.db.collection('newsletterSubscribers').find({}).toArray();
    console.log('newsletterSubscribers after migration:', after.length);
  }catch(err){
    console.error('Migration error:', err);
  }finally{
    await mongoose.disconnect();
  }
}

main();
