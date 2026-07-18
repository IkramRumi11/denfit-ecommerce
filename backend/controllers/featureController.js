import { getFeatureFlags, getFeatureFlagsEffective } from '../src/config/featureFlags.js';
import FeatureFlag from '../models/FeatureFlag.js';

export const getFeatures = (req, res) => {
  // Evaluate DB overrides and per-user / per-env flags
  (async () => {
    try {
      let effective;
      try {
        effective = await getFeatureFlagsEffective(req);
      } catch (innerErr) {
        console.error('getFeatureFlagsEffective error:', innerErr && innerErr.stack ? innerErr.stack : innerErr);
        throw innerErr;
      }
      try {
        res.setHeader('X-Feature-RaptorMini', effective.raptorMini ? 'true' : 'false');
      } catch (e) {}
      res.status(200).json({ success: true, flags: effective });
    } catch (e) {
      console.warn('featureController: failed to evaluate effective flags', e?.message || e);
      try { console.error('featureController stack:', e && e.stack ? e.stack : e); } catch (err) {}
      const flags = getFeatureFlags();
      try { res.setHeader('X-Feature-RaptorMini', flags.raptorMini ? 'true' : 'false'); } catch (err) {}
      res.status(200).json({ success: true, flags });
    }
  })();
};

export default { getFeatures };
