/**
 * Filter System Seed Script
 *
 * Populates the database with industry-standard filter groups, options, and
 * category-filter configurations for the DENFiT e-commerce platform.
 *
 * Usage: node --experimental-modules backend/seeds/filterSeeds.js
 * Or via npm script: npm run seed:filters
 *
 * Safe to run multiple times — uses upsert logic to avoid duplicates.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

import FilterGroup from '../models/FilterGroup.js';
import FilterOption from '../models/FilterOption.js';
import CategoryFilterConfig from '../models/CategoryFilterConfig.js';

const makeSlug = (v) => String(v || '')
  .toLowerCase()
  .replace(/[^a-z0-9 -]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

// ============================================================
// FILTER GROUP DEFINITIONS
// ============================================================
const FILTER_GROUPS = [
  // ─── GLOBAL FILTERS (appear on ALL categories) ───
  { name: 'Color', slug: 'color', type: 'color-swatch', isGlobal: true, displayOrder: 1, icon: 'Palette', description: 'Product color with visual swatches' },
  { name: 'Brand', slug: 'brand', type: 'multi-select', isGlobal: true, displayOrder: 2, icon: 'Tag', description: 'Product brand' },
  { name: 'Price', slug: 'price', type: 'range', isGlobal: true, displayOrder: 3, icon: 'DollarSign', description: 'Price range filter' },
  { name: 'Rating', slug: 'rating', type: 'single-select', isGlobal: true, displayOrder: 4, icon: 'Star', description: 'Minimum star rating' },
  { name: 'Availability', slug: 'availability', type: 'multi-select', isGlobal: true, displayOrder: 5, icon: 'Package', description: 'Stock availability status' },
  { name: 'Discount', slug: 'discount', type: 'multi-select', isGlobal: true, displayOrder: 6, icon: 'Percent', description: 'Discount percentage ranges' },

  // ─── CLOTHING FILTERS ───
  { name: 'Clothing Size', slug: 'clothing-size', type: 'multi-select', isGlobal: false, displayOrder: 10, icon: 'Ruler', description: 'Standard clothing sizes' },
  { name: 'Fit', slug: 'fit', type: 'multi-select', isGlobal: false, displayOrder: 11, icon: 'Shirt', description: 'Garment fit type' },
  { name: 'Fabric', slug: 'fabric', type: 'multi-select', isGlobal: false, displayOrder: 12, icon: 'Layers', description: 'Fabric/material composition' },
  { name: 'Occasion', slug: 'occasion', type: 'multi-select', isGlobal: false, displayOrder: 13, icon: 'Calendar', description: 'Suitable occasion' },
  { name: 'Season', slug: 'season', type: 'multi-select', isGlobal: false, displayOrder: 14, icon: 'Sun', description: 'Season suitability' },
  { name: 'Neck Type', slug: 'neck-type', type: 'multi-select', isGlobal: false, displayOrder: 15, icon: 'Shirt', description: 'Neckline style' },
  { name: 'Sleeve', slug: 'sleeve', type: 'multi-select', isGlobal: false, displayOrder: 16, icon: 'Shirt', description: 'Sleeve length' },

  // ─── PANTS / TROUSERS SPECIFIC ───
  { name: 'Waist Size', slug: 'waist-size', type: 'multi-select', isGlobal: false, displayOrder: 10, icon: 'Ruler', description: 'Waist measurement in inches' },
  { name: 'Length', slug: 'length', type: 'multi-select', isGlobal: false, displayOrder: 11, icon: 'Ruler', description: 'Inseam length' },
  { name: 'Stretch', slug: 'stretch', type: 'multi-select', isGlobal: false, displayOrder: 17, icon: 'MoveHorizontal', description: 'Stretch level' },

  // ─── HOODIE SPECIFIC ───
  { name: 'Hood Type', slug: 'hood-type', type: 'multi-select', isGlobal: false, displayOrder: 18, icon: 'CloudSnow', description: 'Hood style' },
  { name: 'Zipper', slug: 'zipper', type: 'multi-select', isGlobal: false, displayOrder: 19, icon: 'ArrowUpDown', description: 'Zipper configuration' },

  // ─── FOOTWEAR FILTERS ───
  { name: 'Shoe Size (Men)', slug: 'shoe-size-men', type: 'multi-select', isGlobal: false, displayOrder: 10, icon: 'Footprints', description: 'Men EU shoe sizes' },
  { name: 'Shoe Size (Women)', slug: 'shoe-size-women', type: 'multi-select', isGlobal: false, displayOrder: 10, icon: 'Footprints', description: 'Women EU shoe sizes' },
  { name: 'Shoe Size (Kids)', slug: 'shoe-size-kids', type: 'multi-select', isGlobal: false, displayOrder: 10, icon: 'Footprints', description: 'Kids shoe sizes' },
  { name: 'Width', slug: 'width', type: 'multi-select', isGlobal: false, displayOrder: 11, icon: 'MoveHorizontal', description: 'Shoe width' },
  { name: 'Material', slug: 'material', type: 'multi-select', isGlobal: false, displayOrder: 12, icon: 'Layers', description: 'Primary material' },
  { name: 'Closure Type', slug: 'closure-type', type: 'multi-select', isGlobal: false, displayOrder: 13, icon: 'Link', description: 'Shoe closure mechanism' },
  { name: 'Sports Type', slug: 'sports-type', type: 'multi-select', isGlobal: false, displayOrder: 14, icon: 'Dumbbell', description: 'Intended sport/activity' },
  { name: 'Waterproof', slug: 'waterproof', type: 'boolean', isGlobal: false, displayOrder: 15, icon: 'Droplet', description: 'Waterproof capability' },
];

// ============================================================
// FILTER OPTIONS
// ============================================================
const FILTER_OPTIONS = {
  'color': [
    { value: 'Black', slug: 'black', meta: { hex: '#000000' } },
    { value: 'White', slug: 'white', meta: { hex: '#FFFFFF' } },
    { value: 'Red', slug: 'red', meta: { hex: '#DC2626' } },
    { value: 'Blue', slug: 'blue', meta: { hex: '#2563EB' } },
    { value: 'Navy', slug: 'navy', meta: { hex: '#1E3A5F' } },
    { value: 'Green', slug: 'green', meta: { hex: '#16A34A' } },
    { value: 'Grey', slug: 'grey', meta: { hex: '#6B7280' } },
    { value: 'Brown', slug: 'brown', meta: { hex: '#92400E' } },
    { value: 'Beige', slug: 'beige', meta: { hex: '#D4C5A9' } },
    { value: 'Pink', slug: 'pink', meta: { hex: '#EC4899' } },
    { value: 'Orange', slug: 'orange', meta: { hex: '#EA580C' } },
    { value: 'Yellow', slug: 'yellow', meta: { hex: '#EAB308' } },
    { value: 'Purple', slug: 'purple', meta: { hex: '#7C3AED' } },
    { value: 'Maroon', slug: 'maroon', meta: { hex: '#7F1D1D' } },
    { value: 'Olive', slug: 'olive', meta: { hex: '#65A30D' } },
    { value: 'Teal', slug: 'teal', meta: { hex: '#0D9488' } },
    { value: 'Multi', slug: 'multi', meta: { hex: 'linear-gradient(135deg, #f00, #0f0, #00f)' } },
  ],
  'rating': [
    { value: '4', slug: '4-up', label: '4★ & Up' },
    { value: '3', slug: '3-up', label: '3★ & Up' },
    { value: '2', slug: '2-up', label: '2★ & Up' },
    { value: '1', slug: '1-up', label: '1★ & Up' },
  ],
  'availability': [
    { value: 'in-stock', slug: 'in-stock', label: 'In Stock' },
    { value: 'low-stock', slug: 'low-stock', label: 'Low Stock' },
    { value: 'out-of-stock', slug: 'out-of-stock', label: 'Out of Stock' },
    { value: 'pre-order', slug: 'pre-order', label: 'Pre Order' },
    { value: 'coming-soon', slug: 'coming-soon', label: 'Coming Soon' },
  ],
  'discount': [
    { value: '10', slug: '10-off', label: '10% Off or more' },
    { value: '20', slug: '20-off', label: '20% Off or more' },
    { value: '30', slug: '30-off', label: '30% Off or more' },
    { value: '40', slug: '40-off', label: '40% Off or more' },
    { value: '50', slug: '50-off', label: '50% Off or more' },
    { value: '60', slug: '60-off', label: '60% Off or more' },
  ],
  'clothing-size': [
    { value: 'XS', slug: 'xs' },
    { value: 'S', slug: 's' },
    { value: 'M', slug: 'm' },
    { value: 'L', slug: 'l' },
    { value: 'XL', slug: 'xl' },
    { value: 'XXL', slug: 'xxl' },
    { value: '3XL', slug: '3xl' },
  ],
  'fit': [
    { value: 'Slim Fit', slug: 'slim-fit' },
    { value: 'Regular Fit', slug: 'regular-fit' },
    { value: 'Relaxed Fit', slug: 'relaxed-fit' },
    { value: 'Straight Fit', slug: 'straight-fit' },
    { value: 'Skinny Fit', slug: 'skinny-fit' },
    { value: 'Wide Leg', slug: 'wide-leg' },
    { value: 'Oversized', slug: 'oversized' },
    { value: 'Cargo', slug: 'cargo' },
    { value: 'Jogger', slug: 'jogger' },
  ],
  'fabric': [
    { value: 'Cotton', slug: 'cotton' },
    { value: 'Polyester', slug: 'polyester' },
    { value: 'Linen', slug: 'linen' },
    { value: 'Denim', slug: 'denim' },
    { value: 'Fleece', slug: 'fleece' },
    { value: 'Silk', slug: 'silk' },
    { value: 'Wool', slug: 'wool' },
    { value: 'Nylon', slug: 'nylon' },
    { value: 'Blend', slug: 'blend' },
  ],
  'occasion': [
    { value: 'Casual', slug: 'casual' },
    { value: 'Formal', slug: 'formal' },
    { value: 'Sports', slug: 'sports' },
    { value: 'Party', slug: 'party' },
    { value: 'Work', slug: 'work' },
    { value: 'Lounge', slug: 'lounge' },
  ],
  'season': [
    { value: 'Summer', slug: 'summer' },
    { value: 'Winter', slug: 'winter' },
    { value: 'Spring', slug: 'spring' },
    { value: 'Fall', slug: 'fall' },
    { value: 'All Season', slug: 'all-season' },
  ],
  'neck-type': [
    { value: 'Round Neck', slug: 'round-neck' },
    { value: 'V-Neck', slug: 'v-neck' },
    { value: 'Polo', slug: 'polo' },
    { value: 'Mandarin', slug: 'mandarin' },
    { value: 'Crew Neck', slug: 'crew-neck' },
    { value: 'Henley', slug: 'henley' },
  ],
  'sleeve': [
    { value: 'Full Sleeve', slug: 'full-sleeve' },
    { value: 'Half Sleeve', slug: 'half-sleeve' },
    { value: 'Sleeveless', slug: 'sleeveless' },
    { value: '3/4 Sleeve', slug: 'three-quarter' },
  ],
  'waist-size': Array.from({ length: 17 }, (_, i) => ({ value: String(28 + i), slug: String(28 + i) })),
  'length': [
    { value: 'Short', slug: 'short' },
    { value: 'Regular', slug: 'regular' },
    { value: 'Long', slug: 'long' },
    { value: 'Ankle', slug: 'ankle' },
  ],
  'stretch': [
    { value: 'Non-Stretch', slug: 'non-stretch' },
    { value: 'Stretch', slug: 'stretch' },
    { value: '4-Way Stretch', slug: '4-way-stretch' },
  ],
  'hood-type': [
    { value: 'Pullover', slug: 'pullover' },
    { value: 'Drawstring', slug: 'drawstring' },
    { value: 'Lined', slug: 'lined' },
    { value: 'Oversized Hood', slug: 'oversized-hood' },
  ],
  'zipper': [
    { value: 'Full Zip', slug: 'full-zip' },
    { value: 'Half Zip', slug: 'half-zip' },
    { value: 'No Zip', slug: 'no-zip' },
    { value: 'Quarter Zip', slug: 'quarter-zip' },
  ],
  'shoe-size-men': [39, 40, 41, 42, 43, 44, 45, 46].map(s => ({ value: `EU ${s}`, slug: `eu-${s}`, meta: { region: 'EU', gender: 'men' } })),
  'shoe-size-women': [35, 36, 37, 38, 39, 40, 41].map(s => ({ value: `EU ${s}`, slug: `eu-${s}`, meta: { region: 'EU', gender: 'women' } })),
  'shoe-size-kids': [
    { value: '0-6 Months', slug: '0-6m', meta: { ageGroup: 'baby' } },
    { value: '6-12 Months', slug: '6-12m', meta: { ageGroup: 'baby' } },
    { value: '12-24 Months', slug: '12-24m', meta: { ageGroup: 'baby' } },
    ...[2,3,4,5,6,7,8].map(y => ({ value: `${y}Y`, slug: `${y}y`, meta: { ageGroup: 'kids' } })),
    ...[28,29,30,31,32,33,34,35].map(s => ({ value: `EU ${s}`, slug: `eu-${s}`, meta: { region: 'EU', ageGroup: 'kids' } })),
  ],
  'width': [
    { value: 'Narrow', slug: 'narrow' },
    { value: 'Regular', slug: 'regular' },
    { value: 'Wide', slug: 'wide' },
    { value: 'Extra Wide', slug: 'extra-wide' },
  ],
  'material': [
    { value: 'Leather', slug: 'leather' },
    { value: 'Mesh', slug: 'mesh' },
    { value: 'Canvas', slug: 'canvas' },
    { value: 'Rubber', slug: 'rubber' },
    { value: 'Synthetic', slug: 'synthetic' },
    { value: 'Suede', slug: 'suede' },
    { value: 'Textile', slug: 'textile' },
    { value: 'Steel', slug: 'steel' },
    { value: 'Silicone', slug: 'silicone' },
    { value: 'Wood', slug: 'wood' },
    { value: 'Gold', slug: 'gold' },
    { value: 'Silver', slug: 'silver' },
  ],
  'closure-type': [
    { value: 'Lace-Up', slug: 'lace-up' },
    { value: 'Slip-On', slug: 'slip-on' },
    { value: 'Velcro', slug: 'velcro' },
    { value: 'Buckle', slug: 'buckle' },
    { value: 'Zipper', slug: 'zipper' },
  ],
  'sports-type': [
    { value: 'Running', slug: 'running' },
    { value: 'Walking', slug: 'walking' },
    { value: 'Casual', slug: 'casual' },
    { value: 'Formal', slug: 'formal' },
    { value: 'Hiking', slug: 'hiking' },
    { value: 'Gym', slug: 'gym' },
    { value: 'Basketball', slug: 'basketball' },
    { value: 'Football', slug: 'football' },
    { value: 'Training', slug: 'training' },
  ],
  'waterproof': [
    { value: 'Yes', slug: 'yes' },
    { value: 'No', slug: 'no' },
  ],
};

// ============================================================
// CATEGORY FILTER CONFIGS
// ============================================================
// Maps category slugs to the filter groups that should appear for them
const CATEGORY_CONFIGS = [
  // ─── CLOTHING: T-Shirts, Shirts, Polo ───
  { categorySlug: 't-shirts', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'neck-type', 'sleeve', 'occasion', 'season'] },
  { categorySlug: 'shirts', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'neck-type', 'sleeve', 'occasion', 'season'] },
  { categorySlug: 'polo', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'occasion'] },

  // ─── CLOTHING: Hoodies ───
  { categorySlug: 'hoodies-sweatshirts', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'hood-type', 'zipper', 'season'] },

  // ─── CLOTHING: Pants & Trousers ───
  { categorySlug: 'pants-trousers', productType: 'clothing', filters: ['waist-size', 'length', 'fit', 'fabric', 'stretch', 'occasion', 'season'] },
  { categorySlug: 'jeans', productType: 'clothing', filters: ['waist-size', 'length', 'fit', 'stretch', 'fabric'] },
  { categorySlug: 'shorts', productType: 'clothing', filters: ['waist-size', 'fit', 'fabric', 'occasion'] },

  // ─── CLOTHING: Jackets & Coats ───
  { categorySlug: 'jackets-coats', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'season', 'occasion'] },
  { categorySlug: 'suits-blazers', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'occasion'] },

  // ─── CLOTHING: Women-specific ───
  { categorySlug: 'dresses', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'neck-type', 'length', 'occasion', 'season'] },
  { categorySlug: 'tops-blouses', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'neck-type', 'occasion'] },
  { categorySlug: 'sweaters-knits', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'neck-type', 'season'] },
  { categorySlug: 'skirts', productType: 'clothing', filters: ['waist-size', 'length', 'fit', 'fabric', 'occasion'] },
  { categorySlug: 'co-ord-sets', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'occasion'] },
  { categorySlug: 'jumpsuits-rompers', productType: 'clothing', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'occasion'] },

  // ─── FOOTWEAR: Men ───
  { categorySlug: 'sneakers', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type', 'sports-type', 'waterproof'] },
  { categorySlug: 'loafers', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'occasion'] },
  { categorySlug: 'boots', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type', 'waterproof', 'season'] },
  { categorySlug: 'sandals', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type'] },
  { categorySlug: 'formal-shoes', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type'] },
  { categorySlug: 'sports-shoes', gender: 'men', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type', 'sports-type', 'waterproof'] },

  // ─── FOOTWEAR: Women ───
  { categorySlug: 'heels', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material', 'occasion'] },
  { categorySlug: 'flats', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material', 'closure-type'] },
  { categorySlug: 'boots', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material', 'closure-type', 'season'] },
  { categorySlug: 'sandals', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material'] },
  { categorySlug: 'sneakers', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material', 'closure-type', 'sports-type'] },
  { categorySlug: 'espadrilles', gender: 'women', productType: 'footwear', filters: ['shoe-size-women', 'material'] },

  // ─── FOOTWEAR: Kids ───
  { categorySlug: 'shoes', gender: 'kids', productType: 'footwear', filters: ['shoe-size-kids', 'width', 'material', 'closure-type'] },

  // ─── SPORTSWEAR ───
  { categorySlug: 'active-tops', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'sports-type'] },
  { categorySlug: 'training-shorts', productType: 'sportswear', filters: ['waist-size', 'fit', 'fabric', 'sports-type'] },
  { categorySlug: 'sports-jackets', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'waterproof', 'season'] },
  { categorySlug: 'gym-wear', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'sports-type'] },
  { categorySlug: 'running-shoes', productType: 'footwear', filters: ['shoe-size-men', 'width', 'material', 'closure-type', 'waterproof'] },
  { categorySlug: 'sports-bras', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'sports-type'] },
  { categorySlug: 'leggings', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'stretch', 'sports-type'] },
  { categorySlug: 'athletic-tops', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'sleeve', 'sports-type'] },
  { categorySlug: 'yoga-pants', productType: 'sportswear', filters: ['clothing-size', 'fit', 'fabric', 'stretch'] },
  { categorySlug: 'training-shoes', productType: 'footwear', filters: ['shoe-size-women', 'width', 'material', 'sports-type'] },

  // ─── ACCESSORIES ───
  { categorySlug: 'watches', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'belts', productType: 'accessories', filters: ['waist-size', 'material'] },
  { categorySlug: 'wallets', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'bags', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'handbags', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'sunglasses', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'hats-caps', productType: 'accessories', filters: ['clothing-size', 'material'] },
  { categorySlug: 'ties', productType: 'accessories', filters: ['material', 'fabric'] },
  { categorySlug: 'jewelry', productType: 'accessories', filters: ['material'] },
  { categorySlug: 'scarves', productType: 'accessories', filters: ['fabric', 'season'] },

  // ─── KIDS CLOTHING ───
  { categorySlug: 't-shirts-tops', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric', 'occasion'] },
  { categorySlug: 'pants-jeans', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric', 'fit'] },
  { categorySlug: 'sets-outfits', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric', 'occasion', 'season'] },
  { categorySlug: 'jackets', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric', 'season'] },
  { categorySlug: 'bodysuits', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric'] },
  { categorySlug: 'rompers', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric'] },
  { categorySlug: 'sleepwear', gender: 'kids', productType: 'clothing', filters: ['clothing-size', 'fabric'] },
];

// ============================================================
// SEEDING LOGIC
// ============================================================
async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/denfit';
  console.log(`\n🌱 Connecting to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  // Step 1: Upsert all FilterGroups
  console.log('📦 Seeding FilterGroups...');
  const groupMap = {}; // slug → ObjectId
  for (const gDef of FILTER_GROUPS) {
    const existing = await FilterGroup.findOneAndUpdate(
      { slug: gDef.slug },
      { $set: gDef },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    groupMap[gDef.slug] = existing._id;
    console.log(`  ✓ ${gDef.name} (${gDef.slug})`);
  }
  console.log(`  → ${Object.keys(groupMap).length} filter groups\n`);

  // Step 2: Upsert all FilterOptions
  console.log('🎨 Seeding FilterOptions...');
  let optionCount = 0;
  for (const [groupSlug, options] of Object.entries(FILTER_OPTIONS)) {
    const groupId = groupMap[groupSlug];
    if (!groupId) {
      console.warn(`  ⚠ No FilterGroup found for slug "${groupSlug}" — skipping`);
      continue;
    }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      await FilterOption.findOneAndUpdate(
        { filterGroup: groupId, slug: opt.slug },
        {
          $set: {
            filterGroup: groupId,
            value: opt.value,
            slug: opt.slug,
            label: opt.label || opt.value,
            displayOrder: i,
            meta: opt.meta || {},
            isEnabled: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      optionCount++;
    }
  }
  console.log(`  → ${optionCount} filter options\n`);

  // Step 3: Upsert CategoryFilterConfigs
  console.log('🗂️  Seeding CategoryFilterConfigs...');
  for (const cfgDef of CATEGORY_CONFIGS) {
    const filterGroups = cfgDef.filters
      .map((fSlug, idx) => {
        const fgId = groupMap[fSlug];
        if (!fgId) {
          console.warn(`  ⚠ Filter "${fSlug}" not found — skipping for ${cfgDef.categorySlug}`);
          return null;
        }
        return { filterGroup: fgId, displayOrder: idx, isRequired: false };
      })
      .filter(Boolean);

    await CategoryFilterConfig.findOneAndUpdate(
      { categorySlug: cfgDef.categorySlug, gender: cfgDef.gender || '' },
      {
        $set: {
          categorySlug: cfgDef.categorySlug,
          gender: cfgDef.gender || '',
          productType: cfgDef.productType || 'clothing',
          filterGroups,
          isEnabled: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${cfgDef.categorySlug}${cfgDef.gender ? ` (${cfgDef.gender})` : ''} → ${cfgDef.filters.length} filters`);
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   ${Object.keys(groupMap).length} filter groups`);
  console.log(`   ${optionCount} filter options`);
  console.log(`   ${CATEGORY_CONFIGS.length} category configs\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
