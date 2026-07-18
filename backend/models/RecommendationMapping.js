import mongoose from 'mongoose';

const RecommendationMappingSchema = new mongoose.Schema({
  from: {
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
  },
  to: [
    {
      category: { type: String },
      subcategory: { type: String },
      weight: { type: Number, default: 1 },
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RecommendationMappingSchema.index({ 'from.category': 1, 'from.subcategory': 1 });

export default mongoose.model('RecommendationMapping', RecommendationMappingSchema);
