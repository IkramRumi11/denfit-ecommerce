import mongoose from 'mongoose';

const detailSectionSchema = new mongoose.Schema({
  title: { type: String },
  type: { type: String, enum: ['description','size','care','howto','delivery','returns','warranty','disclaimer','other'], default: 'other' },
  content: { type: String }, // sanitized HTML
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
}, { _id: false });

const detailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  categorySlug: { type: String, index: true },
  sections: { type: [detailSectionSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('DetailTemplate', detailTemplateSchema);
