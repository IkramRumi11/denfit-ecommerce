const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function main(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';
  try{
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const docs = await mongoose.connection.db.collection('newsletterSubscribers').find({}).sort({ subscribedAt: -1 }).limit(50).toArray();
    console.log('Found', docs.length, 'subscriber(s):');
    console.log(JSON.stringify(docs, null, 2));
  }catch(err){
    console.error('Error:', err);
  }finally{
    await mongoose.disconnect();
  }
}

main();
