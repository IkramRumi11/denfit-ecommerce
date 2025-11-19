// backend/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken'; // Added for getSignedJwtToken if needed
import validator from 'validator';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Please provide your name'], 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Please provide your email'], 
    unique: true, 
    lowercase: true,
    validate: {
      validator: function(v) {
        // Strict email validation: always require a valid email.
        // Development-only bypasses have been removed to avoid accidental insecure behavior.
        return validator.isEmail(v || '');
      },
      message: 'Please provide a valid email'
    },
    index: true
  },
  password: { 
    type: String, 
    required: [true, 'Please provide a password'], 
    minlength: 8,
    select: false 
  },
  role: { 
    type: String, 
    enum: ['customer', 'admin'], 
    default: 'customer' 
  },
  emailVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationExpires: Date,
  lastVerificationSentAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  passwordChangedAt: Date,
  phone: { type: String, unique: true, sparse: true }, // allow multiple nulls via sparse
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  avatar: String,
  addresses: [{
    name: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Pakistan' },
    isDefault: { type: Boolean, default: false }
  }],
  preferences: {
    newsletter: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  deviceInfo: [{  // Added: For login tracking
    userAgent: String,
    ipAddress: String,
    lastAccess: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Simple indexes
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

// Password encryption middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    // Record time of password change so issued JWTs can be invalidated
    if (!this.isNew) {
      // set slightly in the past to avoid potential token creation race
      this.passwordChangedAt = Date.now() - 1000;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after the given JWT timestamp (in seconds)
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return changedTimestamp > JWTTimestamp;
  }
  // False means NOT changed
  return false;
};

// Generate JWT (added for completeness)
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Email verification token
userSchema.methods.createVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Virtual for lock state
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts and optionally lock account
userSchema.methods.incrementLoginAttempts = async function() {
  // If previously locked but lock has expired, reset counts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
    await this.save({ validateBeforeSave: false });
    return;
  }

  this.loginAttempts = (this.loginAttempts || 0) + 1;

  // Lock condition (example: 5 failed attempts -> lock)
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts >= MAX_ATTEMPTS) {
    this.lockUntil = Date.now() + LOCK_TIME;
  }

  await this.save({ validateBeforeSave: false });
};

// Reset login attempts after successful login
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);
export default User;