import express from 'express';
import SystemSetting from '../models/SystemSetting.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { getShippingConfig, interpolateShippingMessage } from '../utils/shippingHelper.js';

const router = express.Router();

const DEFAULT_ANNOUNCEMENTS = {
  messages: ['Free shipping on orders over Rs. 5,000'],
  enabled: true,
  intervalSeconds: 4,
};

const DEFAULT_BANNERS = {};

// ==========================================
// 🌐 PUBLIC ENDPOINT
// ==========================================
router.get('/public', async (req, res) => {
  try {
    const [settings, shippingConfig] = await Promise.all([
      SystemSetting.find({ key: { $in: ['announcements', 'banners'] } }).lean(),
      getShippingConfig().catch(() => null)
    ]);

    const settingMap = {};
    for (const s of settings) {
      settingMap[s.key] = s.value;
    }

    const rawAnnouncements = settingMap.announcements || DEFAULT_ANNOUNCEMENTS;
    const banners = settingMap.banners || DEFAULT_BANNERS;

    // Synchronize any shipping-related announcement messages with active shipping configuration
    const syncedMessages = Array.isArray(rawAnnouncements.messages)
      ? rawAnnouncements.messages.map(m => shippingConfig ? interpolateShippingMessage(m, shippingConfig) : m)
      : rawAnnouncements.messages;

    const announcements = {
      ...rawAnnouncements,
      messages: syncedMessages
    };

    return res.status(200).json({
      success: true,
      data: {
        announcements,
        banners,
      },
    });
  } catch (error) {
    console.error('Failed to get public content settings:', error);
    return res.status(200).json({
      success: true,
      data: {
        announcements: DEFAULT_ANNOUNCEMENTS,
        banners: DEFAULT_BANNERS,
      },
    });
  }
});

// ==========================================
// 🛡️ ADMIN ENDPOINTS
// ==========================================
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const settings = await SystemSetting.find({
      key: { $in: ['announcements', 'banners'] },
    }).lean();

    const settingMap = {};
    for (const s of settings) {
      settingMap[s.key] = s.value;
    }

    return res.status(200).json({
      success: true,
      data: {
        announcements: settingMap.announcements || DEFAULT_ANNOUNCEMENTS,
        banners: settingMap.banners || DEFAULT_BANNERS,
      },
    });
  } catch (error) {
    console.error('Admin get content error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch content settings',
    });
  }
});

router.put('/admin/announcements', protect, authorize('admin'), async (req, res) => {
  try {
    const { messages, enabled = true, intervalSeconds = 4 } = req.body || {};

    let cleanedMessages = [];
    if (Array.isArray(messages)) {
      cleanedMessages = messages
        .map((m) => (typeof m === 'string' ? m.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);
    } else if (typeof messages === 'string' && messages.trim()) {
      cleanedMessages = [messages.trim()];
    }

    if (cleanedMessages.length === 0) {
      cleanedMessages = ['Free shipping on orders over Rs. 5,000'];
    }

    const payload = {
      messages: cleanedMessages,
      enabled: Boolean(enabled),
      intervalSeconds: Math.max(2, Math.min(15, Number(intervalSeconds) || 4)),
    };

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'announcements' },
      {
        key: 'announcements',
        value: payload,
        type: 'json',
        description: 'Header announcement marquee messages (up to 3 rotating)',
        enabled: true,
        createdBy: req.user?._id,
      },
      { upsert: true, new: true }
    );

    try {
      await AuditLog.create({
        type: 'content_setting',
        actor: req.user?._id,
        actorName: req.user?.name,
        action: 'update_announcements',
        payload,
        message: `${req.user?.name || 'Admin'} updated header announcement messages`,
      });
    } catch (e) {
      /* ignore audit error */
    }

    return res.status(200).json({
      success: true,
      message: 'Announcements updated successfully',
      data: { announcements: setting.value },
    });
  } catch (error) {
    console.error('Update announcements error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcements',
    });
  }
});

router.put('/admin/banners', protect, authorize('admin'), async (req, res) => {
  try {
    const { banners } = req.body || {};

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'banners' },
      {
        key: 'banners',
        value: banners || {},
        type: 'json',
        description: 'Promotional and Hero page banners',
        enabled: true,
        createdBy: req.user?._id,
      },
      { upsert: true, new: true }
    );

    try {
      await AuditLog.create({
        type: 'content_setting',
        actor: req.user?._id,
        actorName: req.user?.name,
        action: 'update_banners',
        payload: banners,
        message: `${req.user?.name || 'Admin'} updated hero/promotional banners`,
      });
    } catch (e) {
      /* ignore audit error */
    }

    return res.status(200).json({
      success: true,
      message: 'Banners updated successfully',
      data: { banners: setting.value },
    });
  } catch (error) {
    console.error('Update banners error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update banners',
    });
  }
});

export default router;
