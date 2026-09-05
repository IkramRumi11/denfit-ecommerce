import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { shippingAPI } from '../api';
import {
  ShippingConfig,
  DEFAULT_SHIPPING_CONFIG,
  calculateShipping,
  getFreeShippingThresholdText,
  getFreeShippingShortText,
  getDeliveryPolicyStatement,
  interpolateShippingMessage,
} from '../utils/shippingHelpers';

interface ShippingContextType {
  shippingConfig: ShippingConfig;
  isLoading: boolean;
  error: string | null;
  calculateShippingFee: (discountedSubtotal: number) => number;
  freeShippingText: string;
  freeShippingShortText: string;
  deliveryPolicyText: string;
  formatMessage: (text: string) => string;
  refreshShippingConfig: () => Promise<void>;
  updateConfigLocally: (newConfig: ShippingConfig) => void;
}

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export const ShippingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await shippingAPI.getPublicConfig();
      const cfg = res?.data?.shippingConfig || res?.data?.config || res?.shippingConfig || res?.data;
      if (cfg && typeof cfg === 'object') {
        setShippingConfig({
          shippingFee: Number(cfg.shippingFee) || 0,
          freeShippingThreshold: Number(cfg.freeShippingThreshold) || 0,
          isFreeShippingEnabled: cfg.isFreeShippingEnabled !== false,
          isShippingEnabled: cfg.isShippingEnabled !== false,
          estimatedDeliveryDays: cfg.estimatedDeliveryDays || '5-7 business days',
        });
      }
    } catch (err: any) {
      console.warn('Failed to load shipping config, using defaults', err?.message);
      setError(err?.message || 'Failed to fetch shipping configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const calculateShippingFee = useCallback(
    (discountedSubtotal: number) => {
      return calculateShipping(discountedSubtotal, shippingConfig);
    },
    [shippingConfig]
  );

  const freeShippingText = getFreeShippingThresholdText(shippingConfig);
  const freeShippingShortText = getFreeShippingShortText(shippingConfig);
  const deliveryPolicyText = getDeliveryPolicyStatement(shippingConfig);

  const formatMessage = useCallback(
    (text: string) => {
      return interpolateShippingMessage(text, shippingConfig);
    },
    [shippingConfig]
  );

  const updateConfigLocally = useCallback((newConfig: ShippingConfig) => {
    setShippingConfig(newConfig);
  }, []);

  return (
    <ShippingContext.Provider
      value={{
        shippingConfig,
        isLoading,
        error,
        calculateShippingFee,
        freeShippingText,
        freeShippingShortText,
        deliveryPolicyText,
        formatMessage,
        refreshShippingConfig: fetchConfig,
        updateConfigLocally,
      }}
    >
      {children}
    </ShippingContext.Provider>
  );
};

export const useShipping = (): ShippingContextType => {
  const context = useContext(ShippingContext);
  if (!context) {
    return {
      shippingConfig: DEFAULT_SHIPPING_CONFIG,
      isLoading: false,
      error: null,
      calculateShippingFee: (subtotal: number) => calculateShipping(subtotal, DEFAULT_SHIPPING_CONFIG),
      freeShippingText: getFreeShippingThresholdText(DEFAULT_SHIPPING_CONFIG),
      freeShippingShortText: getFreeShippingShortText(DEFAULT_SHIPPING_CONFIG),
      deliveryPolicyText: getDeliveryPolicyStatement(DEFAULT_SHIPPING_CONFIG),
      formatMessage: (text: string) => interpolateShippingMessage(text, DEFAULT_SHIPPING_CONFIG),
      refreshShippingConfig: async () => {},
      updateConfigLocally: () => {},
    };
  }
  return context;
};
