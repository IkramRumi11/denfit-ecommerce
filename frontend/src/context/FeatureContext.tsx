import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

type FeatureFlags = {
  raptorMini: boolean;
};

type FeatureContextValue = {
  flags: FeatureFlags;
  refresh: () => Promise<void>;
};

const defaultFlags: FeatureFlags = { raptorMini: true }; // default enabled

const FeatureContext = createContext<FeatureContextValue | null>({ flags: defaultFlags, refresh: async () => {} });

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  const fetchFlags = async () => {
    try {
      const res: any = await api.system.getFeatures();
      if (res?.flags) setFlags(res.flags);
      else if (res?.raptorMini !== undefined) setFlags({ raptorMini: res.raptorMini });
    } catch (e) {
      console.debug('[Features] failed to fetch features', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchFlags(); 
    const handler = () => {
      fetchFlags();
    };
    window.addEventListener('features:changed', handler);
    return () => {
      mounted = false;
      window.removeEventListener('features:changed', handler);
    };
  }, []);

  const refresh = async () => {
    await fetchFlags();
  };


  return <FeatureContext.Provider value={{ flags, refresh }}>{children}</FeatureContext.Provider>;
};

export const useFeatures = () => {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error('useFeatures must be used inside FeatureProvider');
  return ctx;
};

export default FeatureContext;
