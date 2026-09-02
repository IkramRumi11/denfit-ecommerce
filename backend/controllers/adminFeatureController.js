import FeatureFlag from '../models/FeatureFlag.js';
import AuditLog from '../models/AuditLog.js';
import { getAllFlagsCache, setAllFlagsCache, clearAllFlagsCache } from '../services/featureFlagCache.js';

// Admin: list flags
export const getAllFlags = async (req, res) => {
  try {
    // Try cache first
    const cached = await getAllFlagsCache();
    if (cached) {
      return res.status(200).json({ success: true, data: { flags: cached, cached: true } });
    }

    const flags = await FeatureFlag.find({}).lean();
    // populate cache for short duration; frontend should gracefully handle misses
    try { await setAllFlagsCache(flags, 60); } catch (e) { /* non-fatal */ }
    res.status(200).json({ success: true, data: { flags, cached: false } });
  } catch (e) {
    console.error('getAllFlags error', e);
    res.status(500).json({ success: false, message: 'Failed to list flags' });
  }
};

// Admin: create or update (upsert) flag
export const createFlag = async (req, res) => {
  try {
    let { name, enabled = true, target = 'global', envName, userId, description } = req.body || {};
    // normalize empty strings to undefined so sparse unique index behaves correctly
    if (typeof envName === 'string' && envName.trim() === '') envName = undefined;
    if (typeof userId === 'string' && userId.trim() === '') userId = undefined;
    if (!name) return res.status(400).json({ success: false, message: 'Missing name' });

    const query = { name, target };
    if (typeof envName !== 'undefined') query.envName = envName;
    if (typeof userId !== 'undefined') query.userId = userId;
    const existing = await FeatureFlag.findOne(query);
    if (existing) {
      existing.enabled = enabled;
      existing.description = description;
      await existing.save();
      try {
        await AuditLog.create({
          type: 'feature_flag',
          actor: req.user ? req.user._id : undefined,
          actorName: req.user ? req.user.name : undefined,
          action: 'update',
          payload: { flagId: existing._id, name, target, envName, userId, enabled },
          message: `${req.user ? req.user.name : 'system'} updated feature flag ${name} to ${enabled}`
        });
      } catch (e) { console.warn('Failed to create audit log for createFlag update', e?.message || e); }
      try { await clearAllFlagsCache(); } catch (e) { /* non-fatal */ }
      return res.status(200).json({ success: true, message: 'Flag updated', data: { flag: existing } });
    }

    let created;
    try {
      created = await FeatureFlag.create({ name, enabled, target, envName, userId, description, createdBy: req.user?._id });
    } catch (createErr) {
      // handle duplicate key errors gracefully
      if (createErr && createErr.code === 11000) {
        console.warn('createFlag duplicate key', createErr.message || createErr);
        return res.status(409).json({ success: false, message: 'Feature flag already exists' });
      }
      throw createErr;
    }
    try {
      await AuditLog.create({
        type: 'feature_flag',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'create',
        payload: { flagId: created._id, name, target, envName, userId, enabled },
        message: `${req.user ? req.user.name : 'system'} created feature flag ${name}`
      });
    } catch (e) { console.warn('Failed to create audit log for createFlag create', e?.message || e); }
    res.status(201).json({ success: true, message: 'Flag created', data: { flag: created } });
    // Invalidate cache after creating a new flag
    try { await clearAllFlagsCache(); } catch (e) { /* non-fatal */ }
  } catch (e) {
    console.error('createFlag error', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed to create flag' });
  }
};

// Admin: update flag by id
export const updateFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const flag = await FeatureFlag.findByIdAndUpdate(id, update, { new: true });
    if (!flag) return res.status(404).json({ success: false, message: 'Flag not found' });
    try {
      await AuditLog.create({
        type: 'feature_flag',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'update',
        payload: { flagId: flag._id, update },
        message: `${req.user ? req.user.name : 'system'} updated feature flag ${flag.name}`
      });
    } catch (e) { console.warn('Failed to create audit log for updateFlag', e?.message || e); }
    res.status(200).json({ success: true, data: { flag } });
    // Invalidate cache after updates
    try { await clearAllFlagsCache(); } catch (e) { /* non-fatal */ }
  } catch (e) {
    console.error('updateFlag error', e);
    res.status(500).json({ success: false, message: 'Failed to update flag' });
  }
};

// Admin: delete flag
export const deleteFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const flag = await FeatureFlag.findByIdAndDelete(id);
    if (!flag) return res.status(404).json({ success: false, message: 'Flag not found' });
    try {
      await AuditLog.create({
        type: 'feature_flag',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'delete',
        payload: { flagId: flag._id, name: flag.name, target: flag.target, envName: flag.envName, userId: flag.userId },
        message: `${req.user ? req.user.name : 'system'} deleted feature flag ${flag.name}`
      });
    } catch (e) { console.warn('Failed to create audit log for deleteFlag', e?.message || e); }
    res.status(200).json({ success: true, message: 'Flag deleted' });
    // Invalidate cache after deletion
    try { await clearAllFlagsCache(); } catch (e) { /* non-fatal */ }
  } catch (e) {
    console.error('deleteFlag error', e);
    res.status(500).json({ success: false, message: 'Failed to delete flag' });
  }
};

export default { getAllFlags, createFlag, updateFlag, deleteFlag };
