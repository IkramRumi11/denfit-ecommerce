import mongoose from 'mongoose';

const filterGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Filter group name is required'],
    trim: true,
    maxlength: [80, 'Name cannot exceed 80 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  // UI rendering type
  type: {
    type: String,
    enum: ['multi-select', 'single-select', 'range', 'boolean', 'color-swatch'],
    default: 'multi-select'
  },
  // Sort order in the filter sidebar
  displayOrder: {
    type: Number,
    default: 0
  },
  // Admin can disable without deleting
  isEnabled: {
    type: Boolean,
    default: true
  },
  // Global filters appear on ALL categories (price, color, brand, rating, availability)
  // Non-global filters are linked to specific categories via CategoryFilterConfig
  isGlobal: {
    type: Boolean,
    default: false
  },
  // Optional lucide icon name for UI rendering
  icon: {
    type: String,
    trim: true,
    default: ''
  },
  // Description shown in admin panel
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate slug from name if not provided
filterGroupSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = String(this.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

filterGroupSchema.index({ isGlobal: 1, isEnabled: 1, displayOrder: 1 });

export default mongoose.model('FilterGroup', filterGroupSchema);
