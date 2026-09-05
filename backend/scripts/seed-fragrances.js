import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denfit-ecommerce';

const fragranceProducts = [
  {
    name: 'Santal Noir Eau de Parfum',
    description: 'An enigmatic unisex fragrance of rich Australian sandalwood, spiced cardamom, and velvety Florentine iris. Hand-poured into a heavyweight frosted flacon with a magnetic cap.',
    price: 185,
    originalPrice: 220,
    category: 'fragrances',
    categorySlug: 'fragrances',
    subcategory: 'eau-de-parfum',
    gender: 'unisex',
    brand: 'DENFiT Private Blend',
    brandSlug: 'denfit-private-blend',
    collectionName: 'Nocturne Collection',
    collectionSlug: 'nocturne-collection',
    sku: 'DF-FRG-SNTL-01',
    isActive: true,
    isFeatured: true,
    sizes: [
      { id: 'sz-50', value: '50 ml', quantity: 25, inStock: true },
      { id: 'sz-100', value: '100 ml', quantity: 15, inStock: true }
    ],
    colors: [],
    stock: [],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
        isPrimary: true,
        order: 0
      }
    ]
  },
  {
    name: 'Rose Royale Extrait',
    description: 'A radiant, opulent bouquet of May rose, Bulgarian damask, and subtle amber nectar. Designed for modern luxury with unmatched longevity and sillage.',
    price: 240,
    originalPrice: 280,
    category: 'fragrances',
    categorySlug: 'fragrances',
    subcategory: 'eau-de-parfum',
    gender: 'women',
    brand: 'DENFiT Haute Parfumerie',
    brandSlug: 'denfit-haute-parfumerie',
    collectionName: 'Royal Florals',
    collectionSlug: 'royal-florals',
    sku: 'DF-FRG-ROSE-02',
    isActive: true,
    isFeatured: true,
    sizes: [
      { id: 'sz-30', value: '30 ml', quantity: 12, inStock: true },
      { id: 'sz-50', value: '50 ml', quantity: 30, inStock: true },
      { id: 'sz-100', value: '100 ml', quantity: 20, inStock: true }
    ],
    colors: [],
    stock: [],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',
        isPrimary: true,
        order: 0
      }
    ]
  },
  {
    name: 'Vetiver Imperial Eau de Toilette',
    description: 'Crisp Haitian vetiver interwoven with smoky cedarwood, pink peppercorn, and bright Calabrian bergamot. An impeccably sharp, masculine signature.',
    price: 145,
    category: 'fragrances',
    categorySlug: 'fragrances',
    subcategory: 'eau-de-toilette',
    gender: 'men',
    brand: 'DENFiT Atelier',
    brandSlug: 'denfit-atelier',
    collectionName: 'Earth & Woods',
    collectionSlug: 'earth-and-woods',
    sku: 'DF-FRG-VETV-03',
    isActive: true,
    isFeatured: true,
    sizes: [
      { id: 'sz-50', value: '50 ml', quantity: 40, inStock: true },
      { id: 'sz-100', value: '100 ml', quantity: 35, inStock: true },
      { id: 'sz-200', value: '200 ml', quantity: 10, inStock: true }
    ],
    colors: [],
    stock: [],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
        isPrimary: true,
        order: 0
      }
    ]
  },
  {
    name: 'Petite Fleur Gentle Mist',
    description: 'An alcohol-free, delicate whisper of sweet chamomile, orange blossom, and soft powdered vanilla. Dermatologist-tested and gentle for younger senses.',
    price: 65,
    category: 'fragrances',
    categorySlug: 'fragrances',
    subcategory: 'body-mist',
    gender: 'kids',
    brand: 'DENFiT Petit',
    brandSlug: 'denfit-petit',
    collectionName: 'Gentle Care',
    collectionSlug: 'gentle-care',
    sku: 'DF-FRG-PETT-04',
    isActive: true,
    isFeatured: false,
    sizes: [
      { id: 'sz-50', value: '50 ml', quantity: 50, inStock: true }
    ],
    colors: [],
    stock: [],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80',
        isPrimary: true,
        order: 0
      }
    ]
  }
];

async function seed() {
  console.log('🌱 Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  for (const item of fragranceProducts) {
    const existing = await Product.findOne({ sku: item.sku });
    if (existing) {
      Object.assign(existing, item);
      existing.inventory = existing.sizes.reduce((acc, s) => acc + (s.quantity || 0), 0);
      await existing.save();
      console.log(`✓ Updated ${item.name} (${item.sku})`);
    } else {
      const p = new Product(item);
      p.inventory = p.sizes.reduce((acc, s) => acc + (s.quantity || 0), 0);
      await p.save();
      console.log(`✓ Created ${item.name} (${item.sku})`);
    }
  }

  console.log('✨ Fragrance products seeded successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error seeding fragrance products:', err);
  process.exit(1);
});
