import { getFeatureFlags } from '../src/config/featureFlags.js';

export const getFeatures = (req, res) => {
  const flags = getFeatureFlags();
  // Set a convenience header too so load-balancers / healthchecks can read the flag
  try {
    res.setHeader('X-Feature-RaptorMini', flags.raptorMini ? 'true' : 'false');
  } catch (e) {
    // ignore header set errors
  }
  res.status(200).json({ success: true, flags });
};

export default { getFeatures };
