// backend/src/config/featureFlags.js
// Provides runtime feature flags for the application. Flags are read from environment
// variables so they can be toggled without code changes.
export function getFeatureFlags() {
  const raptorMiniEnv = process.env.RAPTOR_MINI;
  // Default = enabled if not explicitly set (as per request).
  const raptorMini = typeof raptorMiniEnv === 'undefined' ? true : ['true', '1', 'enabled'].includes(String(raptorMiniEnv).toLowerCase());

  return {
    raptorMini,
  };
}

export default getFeatureFlags;
