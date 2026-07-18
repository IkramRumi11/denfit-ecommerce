import mongoose from 'mongoose';

const sizeEntry = new mongoose.Schema({
  value: { type: String, required: true }, // e.g. 'S' or '40'
  label: { type: String }, // friendly label
  meta: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const sizeProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: '' }, // e.g. 'clothes','shoes','accessories' or subcategory slug
  type: { type: String, default: 'generic' }, // e.g. 'clothes'|'shoes'|'accessory'
  gender: { type: String, default: '' }, // men|women|kids|unisex or empty
  locale: { type: String, default: 'default' },
  sizes: { type: [sizeEntry], default: [] },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

sizeProfileSchema.index({ name: 1, category: 1, gender: 1 });

export default mongoose.model('SizeProfile', sizeProfileSchema);
