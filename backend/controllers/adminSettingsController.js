import SystemSetting from '../models/SystemSetting.js';
import AuditLog from '../models/AuditLog.js';
import { notifyChange } from '../services/systemSettingsService.js';
import FeatureFlag from '../models/FeatureFlag.js';
import SizeProfile from '../models/SizeProfile.js';

export const listSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({}).lean();
    res.status(200).json({ success: true, data: { settings } });
  } catch (e) {
    console.error('listSettings error', e);
    res.status(500).json({ success: false, message: 'Failed to list settings' });
  }
};

export const createSetting = async (req, res) => {
  try {
    const { key, value, type = 'string', description = '', enabled = true } = req.body || {};
    if (!key) return res.status(400).json({ success: false, message: 'Missing key' });
    const existing = await SystemSetting.findOne({ key });
    if (existing) return res.status(409).json({ success: false, message: 'Setting already exists' });
    const created = await SystemSetting.create({ key, value, type, description, enabled, createdBy: req.user?._id });
    try { await AuditLog.create({ type: 'system_setting', actor: req.user?._id, actorName: req.user?.name, action: 'create', payload: { id: created._id, key }, message: `${req.user?.name || 'system'} created setting ${key}` }); } catch (e) {}
    // notify
    notifyChange({ action: 'create', setting: created });
    res.status(201).json({ success: true, data: { setting: created } });
  } catch (e) {
    console.error('createSetting error', e);
    res.status(500).json({ success: false, message: 'Failed to create setting' });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const setting = await SystemSetting.findByIdAndUpdate(id, update, { new: true });
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });
    try { await AuditLog.create({ type: 'system_setting', actor: req.user?._id, actorName: req.user?.name, action: 'update', payload: { id: setting._id, update }, message: `${req.user?.name || 'system'} updated setting ${setting.key}` }); } catch (e) {}
    notifyChange({ action: 'update', setting });
    res.status(200).json({ success: true, data: { setting } });
  } catch (e) {
    console.error('updateSetting error', e);
    res.status(500).json({ success: false, message: 'Failed to update setting' });
  }
};

export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await SystemSetting.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ success: false, message: 'Setting not found' });
    try { await AuditLog.create({ type: 'system_setting', actor: req.user?._id, actorName: req.user?.name, action: 'delete', payload: { id: removed._id, key: removed.key }, message: `${req.user?.name || 'system'} deleted setting ${removed.key}` }); } catch (e) {}
    notifyChange({ action: 'delete', setting: removed });
    res.status(200).json({ success: true, message: 'Setting deleted' });
  } catch (e) {
    console.error('deleteSetting error', e);
    res.status(500).json({ success: false, message: 'Failed to delete setting' });
  }
};

// Aggregate endpoint: settings + feature flags + size profiles
export const aggregateSettings = async (req, res) => {
  try {
    const [settings, flags, profiles] = await Promise.all([
      SystemSetting.find({}).lean(),
      FeatureFlag.find({}).lean(),
      SizeProfile.find({}).lean(),
    ]);
    res.status(200).json({ success: true, data: { settings, flags, profiles } });
  } catch (e) {
    console.error('aggregateSettings error', e);
    res.status(500).json({ success: false, message: 'Failed to aggregate settings' });
  }
};

// Import existing feature flags into settings store (creates keys like feature:{name})
export const importFeatureFlagsToSettings = async (req, res) => {
  try {
    const flags = await FeatureFlag.find({}).lean();
    const ops = [];
    for (const f of flags) {
      const key = `feature.${f.name}`;
      ops.push({ updateOne: { filter: { key }, update: { $set: { key, value: !!f.enabled, type: 'boolean', description: `Imported feature flag ${f.name}`, enabled: true } }, upsert: true } });
    }
    if (ops.length) await SystemSetting.bulkWrite(ops);
    notifyChange({ action: 'import_features', count: ops.length });
    res.status(200).json({ success: true, message: `Imported ${ops.length} flags` });
  } catch (e) {
    console.error('importFeatureFlagsToSettings error', e);
    res.status(500).json({ success: false, message: 'Failed to import feature flags' });
  }
};

// Import size profiles into settings store (creates keys like sizeProfile:{name})
export const importSizeProfilesToSettings = async (req, res) => {
  try {
    const profiles = await SizeProfile.find({}).lean();
    const ops = [];
    for (const p of profiles) {
      const key = `sizeProfile.${p.name}`;
      ops.push({ updateOne: { filter: { key }, update: { $set: { key, value: p, type: 'json', description: `Imported size profile ${p.name}`, enabled: true } }, upsert: true } });
    }
    if (ops.length) await SystemSetting.bulkWrite(ops);
    notifyChange({ action: 'import_size_profiles', count: ops.length });
    res.status(200).json({ success: true, message: `Imported ${ops.length} size profiles` });
  } catch (e) {
    console.error('importSizeProfilesToSettings error', e);
    res.status(500).json({ success: false, message: 'Failed to import size profiles' });
  }
};

// Server-Sent Events stream for real-time updates
export const streamSettings = async (req, res) => {
  try {
    // Ensure client accepts SSE
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    });

    // send a ping to keep connection alive
    const write = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    // initial handshake
    write({ event: 'connected', ts: Date.now() });

    const onChange = (payload) => {
      try { write({ event: 'change', payload }); } catch (e) {}
    };

    // subscribe to in-process emitter
    const { onChange: onServiceChange, offChange } = await import('../services/systemSettingsService.js');
    onServiceChange(onChange);

    // Remove listener when client disconnects
    req.on('close', () => {
      try { offChange(onChange); } catch (e) {}
    });
  } catch (e) {
    console.error('streamSettings error', e);
    res.status(500).end();
  }
};

export default { listSettings, createSetting, updateSetting, deleteSetting, streamSettings };
