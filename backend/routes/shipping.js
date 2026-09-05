import express from 'express';
import SystemSetting from '../models/SystemSetting.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { getShippingConfig, clearShippingCache, DEFAULT_SHIPPING_CONFIG } from '../utils/shippingHelper.js';

const router = express.Router();

// ==========================================
// 🌐 PUBLIC ENDPOINT
// ==========================================
router.get('/config', async (req, res) => {
  try {
    const config = await getShippingConfig();
    return res.status(200).json({
      success: true,
      data: { shippingConfig: config }
    });
  } catch (error) {
    console.error('Failed to get public shipping config:', error);
    return res.status(200).json({
      success: true,
      data: { shippingConfig: DEFAULT_SHIPPING_CONFIG }
    });
  }
});

// ==========================================
// 🛡️ ADMIN ENDPOINTS
// ==========================================
router.get('/admin/config', protect, authorize('admin'), async (req, res) => {
  try {
    const config = await getShippingConfig();
    const settingDoc = await SystemSetting.findOne({ key: 'shipping_config' }).lean();

    return res.status(200).json({
      success: true,
      data: {
        shippingConfig: config,
        lastUpdated: settingDoc?.updatedAt || null,
        updatedBy: settingDoc?.createdBy || null
      }
    });
  } catch (error) {
    console.error('Admin get shipping config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping configuration'
    });
  }
});

router.put('/admin/config', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      shippingFee,
      freeShippingThreshold,
      isFreeShippingEnabled,
      isShippingEnabled,
      estimatedDeliveryDays
    } = req.body || {};

    const parsedFee = (typeof shippingFee === 'number' || !isNaN(Number(shippingFee)))
      ? Math.max(0, Number(shippingFee))
      : DEFAULT_SHIPPING_CONFIG.shippingFee;

    const parsedThreshold = (typeof freeShippingThreshold === 'number' || !isNaN(Number(freeShippingThreshold)))
      ? Math.max(0, Number(freeShippingThreshold))
      : DEFAULT_SHIPPING_CONFIG.freeShippingThreshold;

    const parsedIsFreeEnabled = typeof isFreeShippingEnabled === 'boolean'
      ? isFreeShippingEnabled
      : Boolean(isFreeShippingEnabled);

    const parsedIsShippingEnabled = typeof isShippingEnabled === 'boolean'
      ? isShippingEnabled
      : Boolean(isShippingEnabled);

    const parsedDeliveryDays = typeof estimatedDeliveryDays === 'string' && estimatedDeliveryDays.trim()
      ? estimatedDeliveryDays.trim()
      : DEFAULT_SHIPPING_CONFIG.estimatedDeliveryDays;

    const newConfig = {
      shippingFee: parsedFee,
      freeShippingThreshold: parsedThreshold,
      isFreeShippingEnabled: parsedIsFreeEnabled,
      isShippingEnabled: parsedIsShippingEnabled,
      estimatedDeliveryDays: parsedDeliveryDays
    };

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'shipping_config' },
      {
        key: 'shipping_config',
        value: newConfig,
        type: 'json',
        description: 'Admin-controlled Shipping Charges and Free Shipping Threshold configuration',
        enabled: true,
        createdBy: req.user?._id
      },
      { upsert: true, new: true }
    );

    // Invalidate in-memory cache
    clearShippingCache();

    // Audit log
    try {
      await AuditLog.create({
        type: 'shipping_config',
        actor: req.user?._id,
        actorName: req.user?.name,
        action: 'update_shipping_config',
        payload: newConfig,
        message: `${req.user?.name || 'Admin'} updated shipping configuration (Fee: Rs. ${parsedFee}, Threshold: Rs. ${parsedThreshold}, Free Shipping: ${parsedIsFreeEnabled ? 'Enabled' : 'Disabled'})`
      });
    } catch (e) {
      /* ignore audit error */
    }

    return res.status(200).json({
      success: true,
      message: 'Shipping configuration updated successfully',
      data: { shippingConfig: setting.value }
    });
  } catch (error) {
    console.error('Update shipping config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update shipping configuration'
    });
  }
});

export default router;
