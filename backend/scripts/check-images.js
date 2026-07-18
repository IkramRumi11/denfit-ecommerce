import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.join(__dirname, '..'));

import { connectDB } from '../src/config/database.js';
import Product from '../models/Product.js';

const run = async () => {
  await connectDB();

  const products = await Product.find().lean().limit(1000);
  let total = 0;
  let noImages = 0;
  let imagesStringsCount = 0;
  let imagesObjectsCount = 0;
  let fewerThan4Strings = 0;
  let fewerThan4Objects = 0;
  const sampleFew = [];

  for (const p of products) {
    total++;
    const imgs = p.images;
    if (!imgs || (Array.isArray(imgs) && imgs.length === 0)) {
      noImages++;
      sampleFew.push({ id: p._id, images: imgs });
      continue;
    }
    if (Array.isArray(imgs)) {
      const first = imgs[0];
      if (typeof first === 'string') {
        imagesStringsCount++;
        if (imgs.length < 4) {
          fewerThan4Strings++;
          sampleFew.push({ id: p._id, images: imgs });
        }
      } else {
        imagesObjectsCount++;
        if (imgs.length < 4) {
          fewerThan4Objects++;
          sampleFew.push({ id: p._id, images: imgs.map(i => (i && i.url) ? i.url : i) });
        }
      }
    } else {
      // unexpected type
      sampleFew.push({ id: p._id, images: imgs });
    }
  }

  console.log('Checked products:', total);
  console.log('No images:', noImages);
  console.log('Images stored as strings:', imagesStringsCount);
  console.log('Images stored as objects:', imagesObjectsCount);
  console.log('Products with <4 images (strings):', fewerThan4Strings);
  console.log('Products with <4 images (objects):', fewerThan4Objects);
  console.log('Sample few (<4 or missing):', sampleFew.slice(0, 10));
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });