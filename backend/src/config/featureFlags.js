// backend/src/config/featureFlags.js
// Provides runtime feature flags for the application. Flags are read from environment
// variables so they can be toggled without code changes.
import FeatureFlag from '../../models/FeatureFlag.js';

export function getFeatureFlags() {
  const raptorMiniEnv = process.env.RAPTOR_MINI;
  // Default = enabled if not explicitly set (as per request).
  const raptorMini = typeof raptorMiniEnv === 'undefined' ? true : ['true', '1', 'enabled'].includes(String(raptorMiniEnv).toLowerCase());

  return {
    raptorMini,
  };
}

export default getFeatureFlags;

// Get flags by merging DB-defined flags (if available) for the provided request context.
export async function getFeatureFlagsEffective(req) {
  const flags = getFeatureFlags();
  try {
    if (!FeatureFlag || !FeatureFlag.find) return flags;
    // Fetch all persisted flags and let them define new names as well as overrides
    const allDbFlags = await FeatureFlag.find({}).lean().catch(() => []);
    const overrideMap = {};
    (allDbFlags || []).forEach((f) => {
      if (!overrideMap[f.name]) overrideMap[f.name] = [];
      overrideMap[f.name].push(f);
    });
    for (const name in overrideMap) {
      const list = overrideMap[name];
      let applied = null;
      if (req?.user) {
        const userEntry = list.find((l) => l.target === 'user' && String(l.userId) === String(req.user._id));
        if (userEntry) applied = userEntry.enabled;
      }
      if (applied === null) {
        const envEntry = list.find((l) => l.target === 'environment' && l.envName === process.env.NODE_ENV);
        if (envEntry) applied = envEntry.enabled;
      }
      if (applied === null) {
        const globalEntry = list.find((l) => l.target === 'global');
        if (globalEntry) applied = globalEntry.enabled;
      }
      if (applied !== null) flags[name] = applied;
      else if (typeof flags[name] === 'undefined') flags[name] = false;
    }
  } catch (e) {
    console.warn('getFeatureFlagsEffective: failed to merge DB flags', e?.message || e);
  }
  return flags;
}

