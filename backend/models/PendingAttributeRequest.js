import mongoose from 'mongoose';

const pendingAttributeRequestSchema = new mongoose.Schema({
  subcategory: {
    type: String,
    required: true,
    index: true
  },
  attributeName: {
    type: String,
    required: true
  },
  attributeType: {
    type: String,
    enum: ['multi-select', 'single-select', 'text', 'boolean'],
    default: 'multi-select'
  },
  requestedValues: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('PendingAttributeRequest', pendingAttributeRequestSchema);
