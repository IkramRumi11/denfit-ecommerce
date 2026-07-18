import mongoose from 'mongoose';
import InventorySyncService from '../services/InventorySyncService.js';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxLength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    set: (value) => Math.round(value * 100) / 100 // Ensure 2 decimal places
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    // Category holds the product's subcategory (e.g. 't-shirts', 'jeans').
    // Sections (men/women/kids/sale) are stored in the `gender` field below.
    index: true
  },
  // Normalized slug for the category/subcategory to make server-side filtering robust
  categorySlug: {
    type: String,
    index: true,
    trim: true,
    lowercase: true
  },
  // Section / gender — maps to frontend `gender` field used by the Shop page
  gender: {
    type: String,
    enum: ['men', 'women', 'kids', 'unisex', 'sale', 'accessories'],
    default: 'men',
    index: true
  },
  // Brand and collection fields are optional but useful for filtering and facets
  brand: {
    type: String,
    trim: true,
    index: true
  },
  brandSlug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  collectionName: {
    type: String,
    trim: true
  },
  collectionSlug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true,
    maxlength: [60, 'SKU cannot exceed 60 characters']
  },
  // Auto-generated human-friendly slug is stored under seo.slug; sku is unique ID for inventory
  images: {
    type: [{
      url: {
        type: String,
        required: [true, 'Image url is required']
      },
      filename: String,
      publicId: String,
      isPrimary: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length >= 1;
      },
      message: 'Product must have at least 1 image'
    }
  },
  // Variants: preferred model for color/size/image per-color galleries
  // Keep `images` and `colors` for backwards compatibility during migration.
  variants: [{
    name: { type: String }, // e.g. 'Black', 'Blue'
    hex: { type: String }, // optional hex code for swatch rendering (e.g. '#000000')
    sku: { type: String },
    // Optional small swatch image (URL) for textured patterns or gradients
    swatchImage: {
      url: String,
      filename: String,
      publicId: String
    },
    images: [{
      url: { type: String, required: true },
      filename: String,
      publicId: String,
      isPrimary: { type: Boolean, default: false },
      order: { type: Number, default: 0 }
    }],
    // Sizes available specifically for this variant (optional; falls back to product.availableSizes)
    availableSizes: [{ type: String }],
    // Inventory can be tracked per-variant
    inventory: { type: Number, default: 0, min: 0 }
  }],
  // Sizes: admin-controlled size entries. Stored as objects to preserve availability and quantity.
  sizes: [{
    id: { type: String }, // admin-generated id for the size entry
    value: { type: String, required: true }, // e.g., 'S', 'M', '42'
    inStock: { type: Boolean, default: true },
    quantity: { type: Number, default: null, min: 0 }
  }],
  // Stock mapping per color and size. Each entry represents a color-size combination
  // Example: { colorTempId: 'color_xxx', sizeId: 'size_xxx', quantity: 9 }
  stock: [{
    colorTempId: { type: String },
    sizeId: { type: String },
    quantity: { type: Number, default: 0, min: 0 }
  }],
  // Per-product available sizes (stores the set of size values enabled for this product)
  availableSizes: [{ type: String }],
  colors: [{
    name: String,
    hex: String,
    // Raw admin input (e.g., 'red' or '#ff0000' or 'rgb(255,0,0)')
    value: String,
    // Normalized hex when available (e.g., '#FF0000')
    normalizedHex: String
  }],
  inventory: {
    type: Number,
    required: true,
    min: [0, 'Inventory cannot be negative'],
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  trending: {
    type: Boolean,
    default: false
  },
  // Publication status: draft/published/archived
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  tags: [String],
  specifications: {
    material: String,
    care: String,
    fit: String,
    origin: String
  },
  // Size guide for the product: image URL, short description, and optional HTML table
  sizeGuide: {
    image: { type: String },
    description: { type: String, maxLength: [2000, 'Size guide description too long'] },
    // For flexibility, admins can store an HTML snippet (table) or plain text
    tableHtml: { type: String }
  },
  // Detail sections: optional per-product rich sections (overrides template)
  detailSections: [{
    title: { type: String },
    type: { type: String, enum: ['description','size','care','howto','delivery','returns','warranty','disclaimer','other'], default: 'other' },
    Icontent: { type: String }, // sanitized HTML or markdown rendered as HTML
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    flags: {
      noExchange: { type: Boolean, default: false },
      noReturns: { type: Boolean, default: false },
      fragile: { type: Boolean, default: false },
      sizeGuideRequired: { type: Boolean, default: false }
    },
    attachments: [{ url: String, label: String, mimeType: String }],
    links: { type: { sizeGuideUrl: String, external: String }, default: {} }
  }],
  // Link to a category-level template (optional)
  detailTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'DetailTemplate' },
  // Related products for "You Might Also Like" (admin-managed)
  relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  // Cached quick policy flags used by frontend for badges
  policyFlags: {
    noExchange: { type: Boolean, default: false },
    noReturns: { type: Boolean, default: false },
    fragile: { type: Boolean, default: false }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // ==================== DYNAMIC FILTERING FIELDS ====================
  // Key-value map for category-specific attributes.
  // Keys are FilterGroup slugs (e.g. 'fit', 'fabric', 'hood-type').
  // Values are arrays of FilterOption slugs to support multi-value attributes.
  // Example: { fit: ['slim-fit'], fabric: ['cotton', 'polyester'], occasion: ['casual', 'office'] }
  attributes: {
    type: Map,
    of: [String],
    default: {}
  },
  // Granular availability status (replaces binary inStock for filter purposes)
  availability: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'pre-order', 'coming-soon'],
    default: 'in-stock',
    index: true
  },
  // Age group for kids/baby product filtering
  ageGroup: {
    type: String,
    enum: ['adult', 'teen', 'kids', 'baby', ''],
    default: ''
  },
  // Promotional/discount tags for filter matching
  discountTags: [{
    type: String,
    enum: ['sale', 'clearance', 'limited-offer', 'new-arrival', 'best-seller', 'trending']
  }],
  // ==================== END FILTERING FIELDS ====================
  seo: {
    title: String,
    description: String,
    slug: String
  },
  configVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Transform output for API consumers: provide legacy `sizes` as array of strings
productSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    try {
      if (Array.isArray(ret.sizes)) {
        // keep original objects under `sizesObjects` for debugging/admin needs
        ret.sizesObjects = JSON.parse(JSON.stringify(ret.sizes));
        // replace `sizes` with simple array of labels for existing frontend code
        ret.sizes = ret.sizes.map(s => (s && (s.value || s.label || s.name)) ? (s.value || s.label || s.name) : s);
      }
    } catch (e) {
      // ignore transform errors
    }
    return ret;
  }
});

// Compound indexes for better query performance
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1, createdAt: -1 });
productSchema.index({ trending: 1, ratings: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Filtering system indexes
productSchema.index({ availability: 1, gender: 1, categorySlug: 1 });
productSchema.index({ ageGroup: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ gender: 1, categorySlug: 1, price: 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for isOnSale
productSchema.virtual('isOnSale').get(function() {
  return this.originalPrice && this.originalPrice > this.price;
});

// Convenience virtual to get array of image urls (for older code expecting strings)
productSchema.virtual('imageUrls').get(function() {
  if (!this.images) return [];
  return this.images.map(img => (img && img.url) ? img.url : img);
});

// Method to sync derived inventory/stock properties
productSchema.methods.deriveInventory = function() {
  InventorySyncService.syncProduct(this);
};

// Update derived inventory and inStock status on save
productSchema.pre('save', function(next) {
  this.deriveInventory();
  next();
});

// Auto-generate slug before saving
productSchema.pre('save', function(next) {
  // Helper to create simple slugs from strings
  const makeSlug = (v) => String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  // Generate product SEO slug from name if missing or name changed
  if (this.isModified('name') && !this.seo?.slug) {
    this.seo = this.seo || {};
    this.seo.slug = makeSlug(this.name);
  }

  // Populate normalized slugs for category, brand, and collection
  try {
    if (this.category) this.categorySlug = makeSlug(this.category);
    if (this.brand) this.brandSlug = makeSlug(this.brand);
    if (this.collectionName) this.collectionSlug = makeSlug(this.collectionName);
  } catch (e) {
    // ignore slug population errors
  }
  next();
});

export default mongoose.model('Product', productSchema);