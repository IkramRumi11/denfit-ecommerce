//backend/models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  image: {
    type: String
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  featured: {
    type: Boolean,
    default: false
  },
  // Product type determines which size system to use for this category
  productType: {
    type: String,
    enum: ['clothing', 'footwear', 'accessories', 'sportswear', 'other'],
    default: 'clothing'
  },
  // Link to a SizeProfile for size options relevant to this category
  sizeProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SizeProfile'
  },
  // Link to the CategoryFilterConfig that defines which filters apply
  filterConfig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoryFilterConfig'
  }
}, {
  timestamps: true
});

export default mongoose.model('Category', categorySchema);