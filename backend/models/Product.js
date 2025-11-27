import mongoose from 'mongoose';

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
    enum: ['men', 'women', 'kids', 'sale'],
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
  images: [{
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
  // Allow arbitrary sizes so admin can enter custom size labels
  sizes: [{ type: String }],
  colors: [{
    name: String,
    hex: String
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
  seo: {
    title: String,
    description: String,
    slug: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1, createdAt: -1 });
productSchema.index({ trending: 1, ratings: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

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

// Update inStock based on inventory
productSchema.pre('save', function(next) {
  this.inStock = this.inventory > 0;
  next();
});

// Auto-generate slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo?.slug) {
    this.seo = this.seo || {};
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

export default mongoose.model('Product', productSchema);