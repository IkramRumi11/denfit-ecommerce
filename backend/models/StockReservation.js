import mongoose from 'mongoose';

const stockReservationSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['stock','size','variant','inventory'], required: true },
  sizeId: { type: String },
  colorTempId: { type: String },
  variantTempId: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['reserved','committed','released'], default: 'reserved' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { timestamps: true });

// Optional TTL for reservations — not relied on for correctness, just cleanup hint
stockReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

export default mongoose.model('StockReservation', stockReservationSchema);
