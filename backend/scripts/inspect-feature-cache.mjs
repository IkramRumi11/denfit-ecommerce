#!/usr/bin/env node
import { getAllFlagsCache } from '../services/featureFlagCache.js';

(async () => {
  try {
    const flags = await getAllFlagsCache();
    if (!flags) {
      console.log('No cached flags (key missing or Redis unreachable)');
      process.exit(0);
    }
    console.log('Cached flags:');
    console.log(JSON.stringify(flags, null, 2));
  } catch (e) {
    console.error('Failed to read feature flags cache:', e?.message || e);
    process.exit(2);
  }
})();
