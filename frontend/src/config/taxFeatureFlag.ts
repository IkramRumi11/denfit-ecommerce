// Frontend tax feature flag
// TAX FEATURE TEMPORARILY DISABLED
// Original 13% tax logic preserved for future reactivation.
// Re-enable this flag to show and calculate tax again.

export const TAX_FEATURE = {
  enabled: false,
  // preserve original rate here for easy re-enable
  rate: 0.13
};

// When re-enabling: set `enabled: true` and ensure backend tax handling
// is also re-enabled. This file centralizes frontend-only toggle.
