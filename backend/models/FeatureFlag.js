import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  target: { type: String, enum: ['global', 'environment', 'user'], default: 'global' },
  envName: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
}, { timestamps: true });

featureFlagSchema.index({ name: 1, target: 1, envName: 1, userId: 1 }, { unique: true, sparse: true });

export default mongoose.model('FeatureFlag', featureFlagSchema);
