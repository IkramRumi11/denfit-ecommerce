import mongoose from 'mongoose';

/**
 * CategoryFilterConfig
 *
 * Links FilterGroups to specific product categories (by slug) and optionally gender.
 * This is the core mapping that makes the filtering system dynamic — when a customer
 * navigates to "Men → Footwear → Sneakers", the frontend fetches the config for
 * categorySlug="sneakers" + gender="men" and gets back only the relevant filter groups
 * (shoe size, width, material, closure type) instead of clothing filters (fit, fabric).
 *
 * For categories where filters are gender-independent, leave gender empty.
 */
const categoryFilterConfigSchema = new mongoose.Schema({
  // Slugified category/subcategory name (e.g. "sneakers", "pants-trousers", "hoodies-sweatshirts")
  categorySlug: {
    type: String,
    required: [true, 'Category slug is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  // Optional gender scoping — allows different filter configs for men's shoes vs women's shoes
  gender: {
    type: String,
    enum: ['men', 'women', 'kids', 'unisex', ''],
    default: '',
    index: true
  },
  // Product type determines which size system to use
  productType: {
    type: String,
    enum: ['clothing', 'footwear', 'accessories', 'sportswear', 'other'],
    default: 'clothing'
  },
  // Ordered list of filter groups assigned to this category
  filterGroups: [{
    filterGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FilterGroup',
      required: true
    },
    // Override display order for this specific category (overrides FilterGroup.displayOrder)
    displayOrder: {
      type: Number,
      default: 0
    },
    // If true, products in this category SHOULD have this attribute set
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  // Link to a SizeProfile for this category (determines which sizes are shown)
  sizeProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SizeProfile'
  },
  // Admin can disable the entire config
  isEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound unique: one config per category+gender combination
categoryFilterConfigSchema.index(
  { categorySlug: 1, gender: 1 },
  { unique: true }
);

export default mongoose.model('CategoryFilterConfig', categoryFilterConfigSchema);
