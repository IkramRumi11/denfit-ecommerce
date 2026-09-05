import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  DollarSign,
  Package,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Check,
  CheckCircle2,
  Tag,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { shippingAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useShipping } from '../../context/ShippingContext';
import {
  ShippingConfig,
  DEFAULT_SHIPPING_CONFIG,
  calculateShipping,
  getFreeShippingThresholdText,
  getDeliveryPolicyStatement,
  interpolateShippingMessage
} from '../../utils/shippingHelpers';

export const AdminShipping: React.FC = () => {
  const { showToast } = useToast();
  const { updateConfigLocally, refreshShippingConfig } = useShipping();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Configuration Form State
  const [formConfig, setFormConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);

  // Interactive Simulator State
  const [simSubtotal, setSimSubtotal] = useState<number>(4500);
  const [simPromoDiscount, setSimPromoDiscount] = useState<number>(0);

  // Helper to safely extract shippingConfig from API responses
  const extractConfig = (res: any): ShippingConfig | null => {
    const raw =
      res?.data?.shippingConfig ||
      res?.data?.config ||
      res?.shippingConfig ||
      res?.data;

    if (!raw || typeof raw !== 'object') return null;

    return {
      shippingFee: typeof raw.shippingFee === 'number' ? raw.shippingFee : Number(raw.shippingFee) || 0,
      freeShippingThreshold: typeof raw.freeShippingThreshold === 'number' ? raw.freeShippingThreshold : Number(raw.freeShippingThreshold) || 0,
      isFreeShippingEnabled: raw.isFreeShippingEnabled !== false,
      isShippingEnabled: raw.isShippingEnabled !== false,
      estimatedDeliveryDays: String(raw.estimatedDeliveryDays || '5-7 business days'),
    };
  };

  // Fetch current Admin configuration
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await shippingAPI.getAdminConfig();
      const loaded = extractConfig(res);
      if (loaded) {
        setFormConfig(loaded);
        setSavedConfig(loaded);
        updateConfigLocally(loaded);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load shipping settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Track if there are unsaved changes
  useEffect(() => {
    const isDifferent =
      formConfig.shippingFee !== savedConfig.shippingFee ||
      formConfig.freeShippingThreshold !== savedConfig.freeShippingThreshold ||
      formConfig.isFreeShippingEnabled !== savedConfig.isFreeShippingEnabled ||
      formConfig.isShippingEnabled !== savedConfig.isShippingEnabled ||
      formConfig.estimatedDeliveryDays !== savedConfig.estimatedDeliveryDays;

    setHasChanges(isDifferent);
  }, [formConfig, savedConfig]);

  // Save Settings handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (formConfig.shippingFee < 0 || formConfig.freeShippingThreshold < 0) {
      showToast('Fee and threshold amounts cannot be negative', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await shippingAPI.updateAdminConfig(formConfig);
      const updated = extractConfig(res);
      
      // Update form state with the response or current formConfig
      const finalConfig = updated || { ...formConfig };
      setFormConfig(finalConfig);
      setSavedConfig(finalConfig);
      updateConfigLocally(finalConfig);
      
      // Also refresh the global context
      try {
        await refreshShippingConfig();
      } catch (e) {
        // ignore
      }

      showToast('Shipping settings updated successfully!', 'success');
      setHasChanges(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save shipping settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setFormConfig({ ...DEFAULT_SHIPPING_CONFIG });
  };

  // Simulator calculations
  const simEffectiveSubtotal = Math.max(0, simSubtotal - simPromoDiscount);
  const simCalculatedShipping = calculateShipping(simEffectiveSubtotal, formConfig);
  const simFinalTotal = simEffectiveSubtotal + simCalculatedShipping;
  const isFreeEligible = simCalculatedShipping === 0;

  // Live preview helpers
  const previewThresholdText = getFreeShippingThresholdText(formConfig);
  const previewPolicyStatement = getDeliveryPolicyStatement(formConfig);
  const previewMarquee = interpolateShippingMessage(
    '📢 Free shipping on orders over Rs. 5,000 | Fast delivery across Pakistan',
    formConfig
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Primary Action */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-neutral-100">
                Shipping & Delivery Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                Configure delivery rates, free shipping thresholds, and keep the marquee, product pages, and checkout synchronized.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={() => setFormConfig({ ...savedConfig })}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition active:scale-95 ${
                hasChanges
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-600/90 hover:bg-indigo-600 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Previews on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Clean Inputs & Toggles */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100 text-base">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Delivery Rates & Rules</span>
              </div>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>

            {/* Standard Shipping Fee Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                  Standard Delivery Fee (PKR)
                </label>
                <span className="text-xs text-gray-400">Current: Rs. {formConfig.shippingFee.toLocaleString()}</span>
              </div>
              <div className="relative rounded-lg">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formConfig.shippingFee}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      shippingFee: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="300"
                />
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[0, 200, 250, 300, 350, 400, 500].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setFormConfig({ ...formConfig, shippingFee: fee })}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      formConfig.shippingFee === fee
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                        : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {fee === 0 ? 'Free (0)' : `Rs. ${fee}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Shipping Minimum Threshold */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                  Free Delivery Threshold (PKR)
                </label>
                <span className="text-xs text-gray-400">Qualifies at: Rs. {formConfig.freeShippingThreshold.toLocaleString()}</span>
              </div>
              <div className="relative rounded-lg">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formConfig.freeShippingThreshold}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      freeShippingThreshold: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="5000"
                />
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[3000, 4000, 5000, 6000, 7000, 10000].map((thr) => (
                  <button
                    key={thr}
                    type="button"
                    onClick={() => setFormConfig({ ...formConfig, freeShippingThreshold: thr })}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      formConfig.freeShippingThreshold === thr
                        ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                        : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Rs. {thr.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Timeframe Text */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
              <label className="text-sm font-medium text-gray-800 dark:text-neutral-200 block">
                Estimated Delivery Timeframe
              </label>
              <input
                type="text"
                value={formConfig.estimatedDeliveryDays}
                onChange={(e) => setFormConfig({ ...formConfig, estimatedDeliveryDays: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="5-7 business days"
              />
              <p className="text-xs text-gray-400">
                Shown to shoppers on product accordions and checkout summaries.
              </p>
            </div>

            {/* Toggle Switches */}
            <div className="pt-3 border-t border-gray-100 dark:border-neutral-800 space-y-3">
              {/* Enable Shipping */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-neutral-800/40 rounded-xl border border-gray-200/60 dark:border-neutral-700/50">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                    Enable Shipping Charges
                  </div>
                  <div className="text-xs text-gray-500 dark:text-neutral-400">
                    If toggled off, store operates in 100% Free Shipping mode.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={formConfig.isShippingEnabled}
                    onChange={(e) => setFormConfig({ ...formConfig, isShippingEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Enable Free Shipping Threshold */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-neutral-800/40 rounded-xl border border-gray-200/60 dark:border-neutral-700/50">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                    Enable Free Shipping on Minimum Spend
                  </div>
                  <div className="text-xs text-gray-500 dark:text-neutral-400">
                    Automatically waive delivery fee when subtotal reaches the threshold.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={formConfig.isFreeShippingEnabled}
                    onChange={(e) => setFormConfig({ ...formConfig, isFreeShippingEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Interactive Simulator & Live Storefront Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Realtime Order Simulator */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Live Calculation Simulator</span>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isFreeEligible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {isFreeEligible ? 'Free Delivery' : `Rs. ${simCalculatedShipping} Fee`}
              </span>
            </div>

            {/* Cart Subtotal Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400 font-medium">
                <span>Sample Cart Subtotal:</span>
                <span className="font-bold text-gray-900 dark:text-neutral-100">Rs. {simSubtotal.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="15000"
                step="250"
                value={simSubtotal}
                onChange={(e) => setSimSubtotal(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Promo Discount Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400 font-medium">
                <span>Promo Discount:</span>
                <span className="font-bold text-gray-900 dark:text-neutral-100">Rs. {simPromoDiscount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(simSubtotal, 5000)}
                step="100"
                value={simPromoDiscount}
                onChange={(e) => setSimPromoDiscount(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
            </div>

            {/* Breakdown Box */}
            <div className="bg-gray-50 dark:bg-neutral-800/60 rounded-xl p-3.5 space-y-2 border border-gray-200/60 dark:border-neutral-700/60 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-neutral-400">
                <span>Subtotal</span>
                <span>Rs. {simSubtotal.toLocaleString()}</span>
              </div>

              {simPromoDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Promo Discount</span>
                  <span>- Rs. {simPromoDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between font-medium text-gray-700 dark:text-neutral-300 pt-1.5 border-t border-gray-200 dark:border-neutral-700">
                <span>Net Subtotal (for threshold)</span>
                <span>Rs. {simEffectiveSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-neutral-700">
                <span className="font-medium text-gray-700 dark:text-neutral-300">Delivery Fee</span>
                {isFreeEligible ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    FREE
                  </span>
                ) : (
                  <span className="font-bold text-gray-900 dark:text-neutral-100">
                    Rs. {simCalculatedShipping.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-neutral-100 pt-2 border-t border-gray-300 dark:border-neutral-600">
                <span>Total Customer Pays</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Rs. {simFinalTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Live Storefront Preview */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100 text-sm pb-3 border-b border-gray-100 dark:border-neutral-800">
              <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Storefront Live Previews</span>
            </div>

            {/* Announcement Marquee */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                Moving Header Marquee:
              </span>
              <div className="bg-slate-600 text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center font-medium shadow-inner truncate">
                {previewMarquee}
              </div>
            </div>

            {/* Product Page Badge */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                Product Page Badge:
              </span>
              <div className="border border-gray-200 dark:border-neutral-700 rounded-xl p-3 bg-gray-50 dark:bg-neutral-800/40 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-neutral-100">
                    {previewThresholdText}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-neutral-400">
                    Est. delivery: {formConfig.estimatedDeliveryDays}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminShipping;
