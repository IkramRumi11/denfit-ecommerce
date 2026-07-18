import asyncHandler from 'express-async-handler';

import User from '../models/User.js';

// @desc Get current user's profile
// @route GET /api/v1/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        emailVerified: user.emailVerified,
        addresses: user.addresses,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    },
  });
});

// @desc Update user profile
// @route PUT /api/v1/auth/me
// @access Private
export const updateMe = asyncHandler(async (req, res) => {
  // Prevent password updates via this route
  if (req.body.password) {
    res.status(400);
    throw new Error('This route is not for password updates. Please use /update-password.');
  }

  // Filter allowed fields — disallow email changes via this endpoint to preserve verification
  const filteredBody = {};
  const allowedFields = ['name', 'phone', 'avatar', 'dateOfBirth', 'gender', 'addresses', 'preferences'];

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = req.body[key];
    }
  });

  // Update user
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        emailVerified: updatedUser.emailVerified,
        addresses: updatedUser.addresses,
        preferences: updatedUser.preferences,
        createdAt: updatedUser.createdAt,
      },
    },
  });
});

// @desc Update user password
// @route PUT /api/v1/auth/update-password
// @access Private
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new password');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!(await user.correctPassword(currentPassword, user.password))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  const token = user.getSignedJwtToken();
  res.status(200).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    },
  });
});