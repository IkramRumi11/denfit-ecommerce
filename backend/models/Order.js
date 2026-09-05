import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  // Color info: optional, but used to map to color-size stock entries
  color: {
    name: { type: String },
    hex: { type: String },
    tempId: { type: String }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // Item-level exchange tracking per DENFiT 14-day policy
  exchange: {
    status: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
      default: 'none'
    },
    reason: { type: String },
    requestedSize: { type: String },
    requestedColor: { type: String },
    requestedQuantity: { type: Number, default: 1 },
    customerNote: { type: String },
    adminNote: { type: String },
    requestedAt: { type: Date },
    resolvedAt: { type: Date },
    resolution: {
      type: String,
      enum: ['none', 'replacement_dispatched', 'store_credit_issued', 'rejected'],
      default: 'none'
    },
    storeCreditCode: { type: String },
    storeCreditAmount: { type: Number }
  }
});

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // optional to support guest checkout
    // required: true
  },
  // For guest (non-registered) checkouts we store the customer's email here
  guestEmail: {
    type: String
  },
  orderNumber: {
    type: String,
    unique: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    // `state` and `zipCode` are optional
    state: { type: String },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'Pakistan' },
    phone: { type: String, required: true },
    // Allow storing an email on the shipping address so orders always carry a contact email
    email: { type: String }
  },
  // A top-level contact email for the order (guest or explicit email provided at checkout)
  contactEmail: {
    type: String
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'cash_on_delivery', 'bank_transfer']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // History of status transitions for audit and traceability
  statusHistory: [
    {
      from: { type: String },
      to: { type: String },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      byName: { type: String },
      note: { type: String },
      at: { type: Date, default: Date.now }
    }
  ],
  // Timestamps for important status transitions
  confirmedAt: { type: Date },
  processingAt: { type: Date },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  recognizedRevenueAt: { type: Date },
  // Shipment/tracking info
  trackingNumber: { type: String },
  trackingUrl: { type: String },
  carrier: { type: String },
  estimatedDelivery: { type: Date },
  adminNote: { type: String },
  refundAmount: { type: Number, default: 0 },
  // Store Credit redemption applied on this order
  storeCreditCode: { type: String, uppercase: true, trim: true },
  storeCreditAmount: { type: Number, default: 0 },
  // Mark orders whose customer account has been anonymized/deleted
  customerDeleted: { type: Boolean, default: false },
  subtotal: {
    type: Number,
    required: true
  },
  promoCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true
  },
  // Preserve historic tax values here when tax is disabled
  legacyTax: {
    type: Number
  },
  legacyTotal: {
    type: Number
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Generate collision-safe order number before saving.
// Format: DF-YYMMDD-XXXXXX (e.g., DF-260628-A3F9B2)
// Uses crypto for randomness and retries on collision against the unique index.
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const crypto = await import('crypto');
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;

    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const hex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars = 16M possibilities
      const candidate = `DF-${datePrefix}-${hex}`;

      // Check uniqueness (only on retries to avoid unnecessary DB calls on first try)
      if (attempt > 0) {
        const existing = await this.constructor.findOne({ orderNumber: candidate }).select('_id').lean();
        if (existing) continue;
      }

      this.orderNumber = candidate;
      break;
    }

    if (!this.orderNumber) {
      // Fallback: use full timestamp + longer random for guaranteed uniqueness
      const ts = Date.now().toString(36);
      const rnd = crypto.randomBytes(4).toString('hex');
      this.orderNumber = `DF-${ts}-${rnd}`.toUpperCase();
    }
  }
  next();
});

// Enforce global tax policy on save: when tax feature disabled, preserve legacy values
// and ensure `taxAmount` remains zero and `total` matches customer-facing total.
orderSchema.pre('save', function(next) {
  const TAX_FEATURE_ENABLED = String(process.env.TAX_FEATURE_ENABLED || '').toLowerCase() === 'true';
  if (!TAX_FEATURE_ENABLED) {
    try {
      const subtotal = Number(this.subtotal || 0);
      const discountAmount = Number(this.discountAmount || 0);
      const shippingCost = Number(this.shippingCost || 0);
      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      // Preserve legacyTax/legacyTotal if this document currently has non-zero values
      if (typeof this.taxAmount === 'number' && Number(this.taxAmount) > 0 && typeof this.legacyTax === 'undefined') {
        this.legacyTax = Number(this.taxAmount);
      }
      if (typeof this.total === 'number' && typeof this.legacyTotal === 'undefined') {
        this.legacyTotal = Number(this.total);
      }
      // Force tax amount to zero and set total to discountedSubtotal + shipping
      this.taxAmount = 0;
      this.total = Math.round((discountedSubtotal + shippingCost) * 100) / 100;
    } catch (e) {
      // don't block save on unexpected errors here
    }
  }
  next();
});

export default mongoose.model('Order', orderSchema);