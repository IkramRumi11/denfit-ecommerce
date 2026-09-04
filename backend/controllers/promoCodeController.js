// backend/controllers/promoCodeController.js
import PromoCode from '../models/PromoCode.js';

/**
 * @desc    Validate a promo code for customer checkout
 * @route   POST /api/v1/orders/validate-promo
 * @access  Public
 */
export const validatePromoCode = async (req, res) => {
  try {
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    const subtotal = Number(req.body?.subtotal) || 0;

    if (!rawCode) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Please provide a promo code.'
      });
    }

    const promo = await PromoCode.findOne({ code: rawCode });

    if (!promo) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid promo code. Please check spelling.'
      });
    }

    const validation = promo.validateForSubtotal(subtotal);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: validation.message
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      promoCode: promo,
      discountAmount: validation.calculatedDiscount,
      calculatedDiscount: validation.calculatedDiscount,
      data: {
        valid: true,
        promoCode: promo,
        code: promo.code,
        discountType: promo.discountType,
        discountAmount: validation.calculatedDiscount,
        calculatedDiscount: validation.calculatedDiscount,
        minOrderAmount: promo.minOrderAmount,
        description: promo.description || ''
      }
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Failed to validate promo code. Please try again.'
    });
  }
};

/**
 * @desc    Get all promo codes (Admin)
 * @route   GET /api/v1/admin/promo-codes
 * @access  Private/Admin
 */
export const getAllPromoCodes = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      query.$or = [{ code: regex }, { description: regex }];
    }

    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.$or = [{ endDate: null }, { endDate: { $gte: now } }];
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endDate = { $lt: now };
    }

    const promoCodes = await PromoCode.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { promoCodes }
    });
  } catch (error) {
    console.error('Error getting promo codes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch promo codes'
    });
  }
};

/**
 * @desc    Get promo code by ID (Admin)
 * @route   GET /api/v1/admin/promo-codes/:id
 * @access  Private/Admin
 */
export const getPromoCodeById = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    return res.status(200).json({ success: true, data: { promoCode: promo } });
  } catch (error) {
    console.error('Error getting promo code by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve promo code' });
  }
};

/**
 * @desc    Create a new promo code (Admin)
 * @route   POST /api/v1/admin/promo-codes
 * @access  Private/Admin
 */
export const createPromoCode = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountAmount,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      isActive,
      maxUses,
      description
    } = req.body;

    const formattedCode = String(code || '').trim().toUpperCase();
    if (!formattedCode) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const existing = await PromoCode.findOne({ code: formattedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Promo code "${formattedCode}" already exists.`
      });
    }

    const numAmount = Number(discountAmount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid discount amount is required.' });
    }

    if (discountType === 'percentage' && numAmount > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
    }

    const newPromo = await PromoCode.create({
      code: formattedCode,
      discountType: discountType || 'percentage',
      discountAmount: numAmount,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      maxUses: maxUses ? Number(maxUses) : null,
      description: description ? String(description).trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: `Promo code ${newPromo.code} created successfully.`,
      data: { promoCode: newPromo }
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Promo code already exists.' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to create promo code.' });
  }
};

/**
 * @desc    Update a promo code (Admin)
 * @route   PUT /api/v1/admin/promo-codes/:id
 * @access  Private/Admin
 */
export const updatePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    const {
      code,
      discountType,
      discountAmount,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      isActive,
      maxUses,
      description
    } = req.body;

    if (code) {
      const formattedCode = String(code).trim().toUpperCase();
      if (formattedCode !== promo.code) {
        const existing = await PromoCode.findOne({ code: formattedCode });
        if (existing) {
          return res.status(400).json({ success: false, message: `Promo code "${formattedCode}" already exists.` });
        }
        promo.code = formattedCode;
      }
    }

    if (discountType) promo.discountType = discountType;
    if (discountAmount != null) {
      const numAmount = Number(discountAmount);
      if (promo.discountType === 'percentage' && numAmount > 100) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
      }
      promo.discountAmount = numAmount;
    }
    if (minOrderAmount != null) promo.minOrderAmount = Number(minOrderAmount);
    if (maxDiscountAmount !== undefined) promo.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    if (startDate !== undefined) promo.startDate = startDate ? new Date(startDate) : promo.startDate;
    if (endDate !== undefined) promo.endDate = endDate ? new Date(endDate) : null;
    if (typeof isActive === 'boolean') promo.isActive = isActive;
    if (maxUses !== undefined) promo.maxUses = maxUses ? Number(maxUses) : null;
    if (description !== undefined) promo.description = String(description).trim();

    await promo.save();

    return res.status(200).json({
      success: true,
      message: 'Promo code updated successfully.',
      data: { promoCode: promo }
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update promo code' });
  }
};

/**
 * @desc    Delete a promo code (Admin)
 * @route   DELETE /api/v1/admin/promo-codes/:id
 * @access  Private/Admin
 */
export const deletePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    return res.status(200).json({
      success: true,
      message: `Promo code ${promo.code} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete promo code' });
  }
};

/**
 * @desc    Toggle active status of a promo code (Admin)
 * @route   PATCH /api/v1/admin/promo-codes/:id/toggle
 * @access  Private/Admin
 */
export const togglePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    promo.isActive = !promo.isActive;
    await promo.save();

    return res.status(200).json({
      success: true,
      message: `Promo code ${promo.code} is now ${promo.isActive ? 'active' : 'inactive'}.`,
      data: { promoCode: promo }
    });
  } catch (error) {
    console.error('Error toggling promo code:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle promo code' });
  }
};
