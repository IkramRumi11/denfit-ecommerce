import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
import Category from '../models/Category.js';

dotenv.config({ path: resolve(process.cwd(), './backend/.env') });

const MONGO = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/denfit-ecommerce';

await mongoose.connect(MONGO);
const cats = await Category.find().lean();
console.log(`Total categories: ${cats.length}`);
for (const c of cats) {
  console.log(`${c._id}	${c.slug}	${c.name}	parent=${c.parent || 'null'}	filterConfig=${c.filterConfig ? 'yes' : 'no'}`);
}
await mongoose.disconnect();
process.exit(0);
