// backend/models/StoreCredit.js
import mongoose from 'mongoose';

const storeCreditSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Store credit code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  guestEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  originalOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId
  },
  initialAmount: {
    type: Number,
    required: [true, 'Credit amount is required'],
    min: [0.01, 'Credit amount must be greater than 0']
  },
  remainingBalance: {
    type: Number,
    required: [true, 'Remaining balance is required'],
    min: [0, 'Remaining balance cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'partially_used', 'fully_redeemed', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from creation
  },
  reason: {
    type: String,
    trim: true
  },
  adminNote: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  redeemedOrders: [
    {
      order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      orderNumber: { type: String },
      amountDeducted: { type: Number, required: true },
      redeemedAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to check if store credit is expired
storeCreditSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
});

// Helper method to validate store credit for a given subtotal
storeCreditSchema.methods.validateForCheckout = function(customerOrEmail = null) {
  const now = new Date();

  if (this.status === 'cancelled') {
    return { valid: false, message: 'This store credit voucher has been cancelled.' };
  }

  if (this.status === 'fully_redeemed' || this.remainingBalance <= 0) {
    return { valid: false, message: 'This store credit voucher has already been fully redeemed.' };
  }

  if (this.expiresAt && now > new Date(this.expiresAt)) {
    return { valid: false, message: 'This store credit voucher has expired.' };
  }

  // If customer-specific, verify owner if provided
  if (customerOrEmail) {
    const customerId = typeof customerOrEmail === 'object' && customerOrEmail?._id ? String(customerOrEmail._id) : (typeof customerOrEmail === 'string' && customerOrEmail.length === 24 ? customerOrEmail : null);
    const email = typeof customerOrEmail === 'string' && customerOrEmail.includes('@') ? customerOrEmail.toLowerCase().trim() : (customerOrEmail?.email ? String(customerOrEmail.email).toLowerCase().trim() : null);

    if (this.customer && customerId && String(this.customer) !== customerId) {
      return { valid: false, message: 'This store credit belongs to a different customer account.' };
    }
    if (this.guestEmail && email && this.guestEmail.toLowerCase() !== email) {
      return { valid: false, message: 'This store credit belongs to a different email address.' };
    }
  }

  return {
    valid: true,
    code: this.code,
    remainingBalance: this.remainingBalance,
    initialAmount: this.initialAmount,
    expiresAt: this.expiresAt
  };
};

// Helper method to validate store credit against a given cart subtotal
storeCreditSchema.methods.validateForSubtotal = function(subtotal = 0, customerOrEmail = null) {
  const checkoutCheck = this.validateForCheckout(customerOrEmail);
  if (!checkoutCheck.valid) {
    return checkoutCheck;
  }
  const numSubtotal = Math.max(0, Number(subtotal));
  const discountAmount = Math.min(numSubtotal, this.remainingBalance);
  const newRemainingBalance = Math.max(0, Math.round((this.remainingBalance - discountAmount) * 100) / 100);

  return {
    valid: true,
    code: this.code,
    discountAmount,
    newRemainingBalance,
    remainingBalance: this.remainingBalance,
    initialAmount: this.initialAmount,
    expiresAt: this.expiresAt
  };
};

// Deduct balance from store credit
storeCreditSchema.methods.deductBalance = function(amount, orderId = null, orderNumber = '') {
  const numAmount = Math.min(this.remainingBalance, Math.max(0, Number(amount)));
  this.remainingBalance = Math.max(0, Math.round((this.remainingBalance - numAmount) * 100) / 100);
  if (this.remainingBalance <= 0) {
    this.status = 'fully_redeemed';
  } else if (this.remainingBalance < this.initialAmount) {
    this.status = 'partially_used';
  }
  if (!this.redeemedOrders) this.redeemedOrders = [];
  this.redeemedOrders.push({
    order: orderId || undefined,
    orderNumber: orderNumber || undefined,
    amountDeducted: numAmount,
    redeemedAt: new Date()
  });
  return this;
};

const StoreCredit = mongoose.models.StoreCredit || mongoose.model('StoreCredit', storeCreditSchema);
export default StoreCredit;
