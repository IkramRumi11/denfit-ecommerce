import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

type FeatureFlags = {
  raptorMini: boolean;
};

const defaultFlags: FeatureFlags = { raptorMini: true }; // default enabled

const FeatureContext = createContext<FeatureFlags | null>(defaultFlags);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  useEffect(() => {
    let mounted = true;
    api.system
      .getFeatures()
      .then((res: any) => {
        if (!mounted) return;
        // Accept either res.flags or res directly
        if (res?.flags) setFlags(res.flags);
        else if (res?.raptorMini !== undefined) setFlags({ raptorMini: res.raptorMini });
      })
      .catch((e: any) => {
        // If endpoint fails, keep default value and silently continue
        console.debug('[Features] failed to fetch features', e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return <FeatureContext.Provider value={flags}>{children}</FeatureContext.Provider>;
};

export const useFeatures = () => {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error('useFeatures must be used inside FeatureProvider');
  return ctx;
};

export default FeatureContext;
