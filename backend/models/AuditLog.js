import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'order_status_change', 'refund', 'user_update'
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String },
  targetOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  action: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AuditLog', auditSchema);
