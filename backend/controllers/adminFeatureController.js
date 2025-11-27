import FeatureFlag from '../models/FeatureFlag.js';
import AuditLog from '../models/AuditLog.js';

// Admin: list flags
export const getAllFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.find({}).lean();
    res.status(200).json({ success: true, data: { flags } });
  } catch (e) {
    console.error('getAllFlags error', e);
    res.status(500).json({ success: false, message: 'Failed to list flags' });
  }
};

// Admin: create or update (upsert) flag
export const createFlag = async (req, res) => {
  try {
    const { name, enabled = true, target = 'global', envName, userId, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Missing name' });
    const existing = await FeatureFlag.findOne({ name, target, envName, userId });
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
      return res.status(200).json({ success: true, message: 'Flag updated', data: { flag: existing } });
    }

    const created = await FeatureFlag.create({ name, enabled, target, envName, userId, description, createdBy: req.user?._id });
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
  } catch (e) {
    console.error('createFlag error', e);
    res.status(500).json({ success: false, message: 'Failed to create flag' });
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
  } catch (e) {
    console.error('deleteFlag error', e);
    res.status(500).json({ success: false, message: 'Failed to delete flag' });
  }
};

export default { getAllFlags, createFlag, updateFlag, deleteFlag };
