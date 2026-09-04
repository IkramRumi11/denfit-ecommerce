// backend/models/PromoCode.js
import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'Promo code must be at least 2 characters'],
    maxlength: [30, 'Promo code cannot exceed 30 characters']
  },
  discountType: {
    type: String,
    enum: {
      values: ['percentage', 'fixed'],
      message: 'Discount type must be either percentage or fixed'
    },
    required: [true, 'Discount type is required']
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0.01, 'Discount amount must be greater than 0']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  maxDiscountAmount: {
    type: Number,
    default: null,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: null,
    min: [1, 'Max uses must be at least 1']
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to check if promo code is currently expired
promoCodeSchema.virtual('isExpired').get(function() {
  if (!this.endDate) return false;
  return new Date() > new Date(this.endDate);
});

// Helper method to validate eligibility against a given subtotal
promoCodeSchema.methods.validateForSubtotal = function(subtotal = 0) {
  const now = new Date();

  if (!this.isActive) {
    return { valid: false, message: 'This promo code is currently inactive.' };
  }

  if (this.startDate && now < new Date(this.startDate)) {
    return { valid: false, message: 'This promo code is not active yet.' };
  }

  if (this.endDate && now > new Date(this.endDate)) {
    return { valid: false, message: 'This promo code has expired.' };
  }

  if (this.maxUses != null && this.usedCount >= this.maxUses) {
    return { valid: false, message: 'This promo code usage limit has been reached.' };
  }

  if (this.minOrderAmount > 0 && subtotal < this.minOrderAmount) {
    return { 
      valid: false, 
      message: `Minimum order amount of Rs. ${this.minOrderAmount.toLocaleString()} required to use this promo code.` 
    };
  }

  let calculatedDiscount = 0;
  if (this.discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * (this.discountAmount / 100)) * 100) / 100;
    if (this.maxDiscountAmount != null && this.maxDiscountAmount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, this.maxDiscountAmount);
    }
  } else if (this.discountType === 'fixed') {
    calculatedDiscount = Math.min(subtotal, this.discountAmount);
  }

  return {
    valid: true,
    calculatedDiscount: Math.max(0, calculatedDiscount),
    discountType: this.discountType,
    discountAmount: this.discountAmount,
    code: this.code
  };
};

const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);
export default PromoCode;
