const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function main(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';
  try{
    await mongoose.connect(uri);
    const subs = await mongoose.connection.db.collection('newsletterSubscribers').find({}).sort({ subscribedAt: -1 }).limit(50).toArray();
    const legacy = await mongoose.connection.db.collection('newsletters').find({}).sort({ subscribedAt: -1 }).limit(50).toArray();
    console.log('newsletterSubscribers:', subs.length);
    console.log(JSON.stringify(subs, null, 2));
    console.log('\nnewsletters:', legacy.length);
    console.log(JSON.stringify(legacy, null, 2));
  }catch(err){
    console.error('Error:', err);
  }finally{
    await mongoose.disconnect();
  }
}

main();
