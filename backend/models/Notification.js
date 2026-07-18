import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true, index: true },
  metadata: { type: Object, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  isDelivered: { type: Boolean, default: false },
  deliveryChannels: { type: [String], default: ['in-app'] },
  scheduledAt: { type: Date, default: null, index: true },
  softDeleted: { type: Boolean, default: false, index: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for performance: user + unread
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
