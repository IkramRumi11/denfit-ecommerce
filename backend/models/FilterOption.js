import mongoose from 'mongoose';

const filterOptionSchema = new mongoose.Schema({
  // Reference to the parent FilterGroup
  filterGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FilterGroup',
    required: [true, 'FilterGroup reference is required'],
    index: true
  },
  // The actual value stored on products (e.g. "slim-fit", "cotton", "#000000")
  value: {
    type: String,
    required: [true, 'Option value is required'],
    trim: true
  },
  // URL-safe slug for query params
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  // Human-readable label (e.g. "Slim Fit", "Cotton", "Black")
  label: {
    type: String,
    trim: true
  },
  // Sort order within the group
  displayOrder: {
    type: Number,
    default: 0
  },
  // Extra metadata — used for colors (hex, swatchImage), sizes (region), etc.
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // For colors: { hex: "#000000", swatchImage: "url" }
    // For sizes:  { region: "EU", gender: "men" }
  },
  // Admin can disable individual options
  isEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-generate slug and label from value
filterOptionSchema.pre('save', function (next) {
  if (this.isModified('value')) {
    if (!this.slug) {
      this.slug = String(this.value || '')
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    if (!this.label) {
      this.label = this.value;
    }
  }
  next();
});

// Compound index for efficient queries: "all enabled options for a filter group, sorted"
filterOptionSchema.index({ filterGroup: 1, isEnabled: 1, displayOrder: 1 });
// Unique constraint: no duplicate values within the same group
filterOptionSchema.index({ filterGroup: 1, slug: 1 }, { unique: true });

export default mongoose.model('FilterOption', filterOptionSchema);
