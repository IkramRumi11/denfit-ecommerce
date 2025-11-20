// backend/controllers/authController.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import EmailService from '../services/emailService.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper: sign JWT token
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });

// Helper: set cookie and respond with user
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const frontendIsHttps = String(frontendUrl).toLowerCase().startsWith('https');

  // Decide secure flag: respect production and explicit SSL, but in development
  // avoid forcing `secure=true` when the frontend is plain HTTP.
  const inferredSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true' || Boolean(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const secureFlag = process.env.NODE_ENV !== 'production' ? (inferredSecure && frontendIsHttps) : inferredSecure;

  // Decide sameSite: prefer 'lax' in production, but for dev keep 'lax' when frontend uses http
  let sameSite = process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'lax' : 'none');
  if (process.env.NODE_ENV !== 'production' && !frontendIsHttps) {
    // Browsers require Secure for SameSite=None; use 'lax' for plain HTTP dev to improve reliability.
    sameSite = 'lax';
  }

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRES_IN || 90) *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
    secure: secureFlag,
    sameSite
    ,
    path: '/' // ensure cookie is sent for the whole site (not just the auth route)
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV] createSendToken cookie options:', { secure: cookieOptions.secure, sameSite: cookieOptions.sameSite });
  }

  // Remove sensitive fields before sending
  user.password = undefined;
  user.loginAttempts = undefined;
  user.lockUntil = undefined;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;

  res.cookie('jwt', token, cookieOptions);

  // For secure cookie-only auth we set the httpOnly cookie and return the
  // user object only. Clients should not rely on receiving the raw token.
  return res.status(statusCode).json({ success: true, data: { user } });
};

// -------- Register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return next(
        new AppError('Please provide name, email and password', 400)
      );
    }

    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, ...(phone ? [{ phone }] : [])]
    });

    if (existing) {
      if (existing.email === normalizedEmail)
        return next(new AppError('This email already exists.', 400));
      if (phone && existing.phone === phone)
        return next(new AppError('This phone number already exists.', 400));
      return next(new AppError('User already exists', 400));
    }

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone
    });

    // Generate verification token and save hashed in DB
    const verificationToken = newUser.createVerificationToken();
  // Record that we sent a verification token right now so resends are throttled
  newUser.lastVerificationSentAt = new Date();
  await newUser.save({ validateBeforeSave: false });

    // Send verification email (enqueue if queue enabled) and record if sent
    let verificationSent = false;
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?mode=verify&token=${verificationToken}`;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Verification URL for ${newUser.email}: ${verificationUrl}`);
      }
      if (process.env.USE_EMAIL_QUEUE === 'true') {
        const { addEmailJob } = await import('../queues/emailQueue.js');
        await addEmailJob('sendWelcomeEmail', { userId: newUser._id.toString(), verificationUrl });
      } else {
        await EmailService.sendWelcomeEmail(newUser, verificationUrl);
      }
      verificationSent = true;
    } catch (emailErr) {
      console.warn('Failed to send/enqueue verification email:', emailErr);
      verificationSent = false;
    }

    // Do NOT auto-login immediately after registration. Require email verification first.
    // Return a clear response instructing the client to prompt the user to verify their email.
    return res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email by clicking the link we sent.',
      verificationSent
    });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return next(new AppError(`The ${field} is already in use`, 400));
    }
    return next(err);
  }
};

// -------- Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new AppError('Please provide email and password', 400));

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select('+password +loginAttempts +lockUntil +emailVerified');

    if (!user)
      return next(new AppError('Incorrect email or password', 401));

    const correct = await user.correctPassword(password, user.password);
    if (!correct) {
      await user.incrementLoginAttempts();
      return next(new AppError('Incorrect email or password', 401));
    }

    if (user.isLocked)
      return next(
        new AppError('Account temporarily locked due to failed attempts', 423)
      );
    if (!user.emailVerified) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] login attempt for unverified user:', {
          email: user.email,
          lastVerificationSentAt: user.lastVerificationSentAt,
          verificationExpires: user.verificationExpires
        });
      }
      // Don't allow login but inform client that verification is required and provide an easy resend option.
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        emailVerified: false,
        canResendVerification: true
      });
    }

    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save({ validateBeforeSave: false });

    try {
      if (process.env.USE_EMAIL_QUEUE === 'true') {
        const { addEmailJob } = await import('../queues/emailQueue.js');
        await addEmailJob('sendLoginNotification', { userId: user._id.toString(), meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] } });
      } else {
        await EmailService.sendLoginNotification(user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      }
    } catch (e) {
      console.warn('Login notification failed:', e);
    }

    // For admin users, attach a lightweight security advisory object so the
    // frontend can present admin-focused controls (2FA recommendation, device info).
    if (user.role === 'admin') {
      user.adminSecurity = {
        require2FA: String(process.env.ADMIN_REQUIRE_2FA).toLowerCase() === 'true',
        lastSeenAt: user.lastLogin,
        loginCount: user.loginCount || 0
      };
    }

    return createSendToken(user, 200, req, res);
  } catch (err) {
    return next(err);
  }
};

// -------- Logout
export const logout = (req, res) => {
  // Determine cookie flags consistent with createSendToken
  const inferredSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true' || Boolean(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH);
  const secureFlag = inferredSecure;
  const sameSite = process.env.NODE_ENV === 'production' ? 'lax' : 'none';

  // Clear JWT cookie by setting a short-lived value
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: secureFlag,
    sameSite,
    path: '/'
  });

  // Also clear the XSRF-TOKEN cookie so the client doesn't rely on stale tokens
  try {
    res.clearCookie('XSRF-TOKEN', {
      httpOnly: false,
      secure: secureFlag,
      sameSite,
      path: '/'
    });
  } catch (e) {
    // ignore clear cookie errors
  }

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// -------- Get Me
export const getMe = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    const user = await User.findById(req.user._id).select(
      '-password -loginAttempts -lockUntil'
    );
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    console.error('Error in getMe:', err);
    next(err);
  }
};

// -------- Update Profile
export const updateMe = async (req, res, next) => {
  try {
    if (req.body.password)
      return next(new AppError('This route is not for password updates', 400));

    const allowed = [
      'name',
      'email',
      'phone',
      'avatar',
      'dateOfBirth',
      'gender'
    ];
    const filtered = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) filtered[f] = req.body[f];
    });

    if (filtered.email) filtered.email = filtered.email.toLowerCase().trim();

    const updated = await User.findByIdAndUpdate(req.user._id, filtered, {
      new: true,
      runValidators: true
    }).select('-password -loginAttempts -lockUntil');

    res.status(200).json({ success: true, data: { user: updated } });
  } catch (err) {
    next(err);
  }
};

// -------- Update Password
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new AppError('User not found', 404));
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    user.password = req.body.password;
    await user.save();
    return createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

// -------- Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    if (!req.body.email)
      return next(new AppError('Please provide your email', 400));

    const user = await User.findOne({
      email: req.body.email.toLowerCase().trim()
    });
    if (!user)
      return next(new AppError('There is no user with that email address.', 404));

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?mode=reset&token=${resetToken}`;
      if (process.env.USE_EMAIL_QUEUE === 'true') {
        const { addEmailJob } = await import('../queues/emailQueue.js');
        await addEmailJob('sendPasswordResetEmail', { userId: user._id.toString(), resetUrl });
      } else {
        await EmailService.sendPasswordResetEmail(user, resetUrl);
      }
      res.status(200).json({ success: true, message: 'Password reset token sent to email!' });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Error sending email. Try again later.', 500));
    }
  } catch (err) {
    next(err);
  }
};

// -------- Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user)
      return next(new AppError('Token is invalid or has expired', 400));

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

// -------- ✅ Verify Email (auto-login)
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!token) return next(new AppError('No token provided', 400));

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user)
      return next(
        new AppError('Verification token is invalid or has expired', 400)
      );

    if (user.emailVerified) {
      return createSendToken(user, 200, req, res);
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    try {
      if (process.env.USE_EMAIL_QUEUE === 'true') {
        const { addEmailJob } = await import('../queues/emailQueue.js');
        await addEmailJob('sendWelcomeVerifiedEmail', { userId: user._id.toString() });
      } else {
        await EmailService.sendWelcomeVerifiedEmail(user);
      }
    } catch (e) {
      console.warn('Failed to send/enqueue verified welcome email:', e);
    }

    // ✅ Auto-login on successful verification
    return createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Email verification error:', err);
    next(err);
  }
};

// -------- Resend Verification
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Please provide an email address', 400));

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return next(new AppError('No user found with that email', 404));
    // If already verified, return success so clients don't repeatedly prompt.
    if (user.emailVerified) {
      return res.status(200).json({ success: true, message: 'Email is already verified', emailVerified: true });
    }

    // Throttle resends to prevent abuse (default cooldown: 60s)
    const COOLDOWN_MS = Number(process.env.VERIFICATION_RESEND_COOLDOWN_MS || 60 * 1000);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] resendVerification - user.lastVerificationSentAt:', user.lastVerificationSentAt, 'COOLDOWN_MS:', COOLDOWN_MS);
    }
    if (user.lastVerificationSentAt && (Date.now() - new Date(user.lastVerificationSentAt).getTime()) < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(user.lastVerificationSentAt).getTime())) / 1000);
      // Set Retry-After header (seconds) and return structured JSON with retryAfter
      try {
        res.setHeader('Retry-After', String(wait));
        // Also ensure these headers are visible to browsers via CORS (server should expose them)
        res.setHeader('X-Verification-Resend-Remaining', String(wait));
      } catch (e) {
        // ignore header set errors
      }
      return res.status(429).json({ success: false, message: `Please wait ${wait}s before requesting another verification email.`, retryAfter: wait });
    }

    // To avoid race conditions when clients call this endpoint concurrently, perform
    // an atomic conditional update: only set `verificationToken` and `lastVerificationSentAt`
    // if the previous `lastVerificationSentAt` is absent or older than the cooldown window.
    const now = new Date();
    const threshold = new Date(Date.now() - COOLDOWN_MS);

    // Create a fresh verification token (raw + hashed) without mutating the current `user` doc.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const updated = await User.findOneAndUpdate(
      {
        email: normalizedEmail,
        $or: [
          { lastVerificationSentAt: { $exists: false } },
          { lastVerificationSentAt: { $lt: threshold } }
        ]
      },
      {
        $set: {
          verificationToken: hashedToken,
          verificationExpires: verificationExpiresAt,
          lastVerificationSentAt: now
        }
      },
      { new: true }
    );

    // If `updated` is null then the conditional update failed -> still in cooldown
    if (!updated) {
  const fresh = await User.findOne({ email: normalizedEmail }).lean();
  const last = fresh?.lastVerificationSentAt ? new Date(fresh.lastVerificationSentAt).getTime() : 0;
  // raw milliseconds remaining (may be larger if DB contains an unexpected future timestamp).
  const rawRemainingMs = COOLDOWN_MS - (Date.now() - last);
  const cappedMs = Math.max(0, Math.min(COOLDOWN_MS, rawRemainingMs));
  const wait = Math.ceil(cappedMs / 1000);
      try {
        res.setHeader('Retry-After', String(wait));
        res.setHeader('X-Verification-Resend-Remaining', String(wait));
      } catch (e) {}
      return res.status(429).json({ success: false, message: `Please wait ${wait}s before requesting another verification email.`, retryAfter: wait });
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?mode=verify&token=${rawToken}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Re-sent verification URL for ${normalizedEmail}: ${verificationUrl}`);
    }

    // Fire-and-forget sending; we already persisted lastVerificationSentAt atomically.
    try {
      await EmailService.sendWelcomeEmail(updated, verificationUrl);
    } catch (e) {
      console.warn('Failed to send verification email (non-fatal):', e);
    }

    const cooldownSecs = Math.ceil(COOLDOWN_MS / 1000);
    try { res.setHeader('Retry-After', String(cooldownSecs)); } catch (e) {}
    try { res.setHeader('X-Verification-Resend-Remaining', String(cooldownSecs)); } catch (e) {}

    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[DEV] resendVerification outgoing headers:', res.getHeaders()); } catch (e) {}
    }

    return res.status(200).json({ success: true, message: 'Verification email re-sent successfully!', emailVerified: false, retryAfter: cooldownSecs });
  } catch (err) {
    console.error('Resend verification error:', err);
    next(err);
  }
};

// -------- Check Email
export const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ exists: false });
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    res.status(200).json({ exists: !!exists });
  } catch (err) {
    next(new AppError('Check failed', 500));
  }
};

// -------- Merge Guest Data
export const mergeGuestData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { cartItems, wishlistItems } = req.body;
    console.log(
      `Merging guest data for ${userId}`,
      {
        cartItems: cartItems ? cartItems.length : 0,
        wishlistItems: wishlistItems ? wishlistItems.length : 0
      }
    );
    res.status(200).json({ success: true, message: 'Guest data merged' });
  } catch (err) {
    next(new AppError('Failed to merge guest data', 500));
  }
};
