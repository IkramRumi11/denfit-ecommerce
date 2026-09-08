import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';

/**
 * Evaluates whether a given user qualifies for Private Sale access.
 * Criteria:
 * 1. Admin / super_admin role -> automatically eligible.
 * 2. User exists and emailVerified === true.
 * 3. User has at least one placed order that is not cancelled.
 */
export const checkEligibility = async (user) => {
  if (!user) {
    return {
      eligible: false,
      reason: 'Please sign in to access Private Sale.',
      requiresLogin: true,
    };
  }

  // Admins always have access
  if (['admin', 'super_admin'].includes(user.role)) {
    return {
      eligible: true,
      isAdmin: true,
      reason: 'Admin access granted',
    };
  }

  // Email verification required
  if (!user.emailVerified) {
    return {
      eligible: false,
      reason: 'Please verify your email address to unlock Private Sale access.',
      requiresVerification: true,
    };
  }

  // At least one qualifying order placed (status != cancelled)
  try {
    const userEmail = user.email ? String(user.email).trim().toLowerCase() : '';
    const orConditions = [{ customer: user._id }];
    if (userEmail) {
      orConditions.push({ guestEmail: new RegExp(`^${userEmail}$`, 'i') });
      orConditions.push({ contactEmail: new RegExp(`^${userEmail}$`, 'i') });
    }

    const orderCount = await Order.countDocuments({
      $or: orConditions,
      status: { $ne: 'cancelled' },
    });

    if (orderCount < 1) {
      return {
        eligible: false,
        reason: 'Private Sale access is reserved for customers with at least one order placed on DENFiT.',
        requiresOrder: true,
        orderCount: 0,
      };
    }

    return {
      eligible: true,
      orderCount,
      reason: 'Access granted',
    };
  } catch (error) {
    console.error('checkEligibility Order count query error:', error);
    return {
      eligible: false,
      reason: 'Error verifying eligibility. Please try again later.',
    };
  }
};

/**
 * Middleware strictly protecting Private Sale endpoints.
 * Returns 401 if unauthenticated, 403 if ineligible.
 */
export const requirePrivateSaleAccess = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        requiresLogin: true,
        message: 'Please sign in to access the Private Sale.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        requiresLogin: true,
        message: 'Your session has expired. Please sign in again.',
      });
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        requiresLogin: true,
        message: 'User account not found. Please sign in again.',
      });
    }

    req.user = currentUser;

    const result = await checkEligibility(currentUser);
    if (!result.eligible) {
      return res.status(403).json({
        success: false,
        ...result,
        message: result.reason,
      });
    }

    req.privateSaleAccess = result;
    next();
  } catch (error) {
    console.error('requirePrivateSaleAccess middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying Private Sale access.',
    });
  }
};

/**
 * Helper to optionally inspect the requester's token and determine if they
 * are eligible for Private Sale (does not throw if token missing/invalid).
 */
export const checkRequesterPrivateSaleAccess = async (req) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return false;

    const user = await User.findById(decoded.id).lean();
    if (!user) return false;

    const result = await checkEligibility(user);
    return !!result.eligible;
  } catch (e) {
    return false;
  }
};
