import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  DollarSign,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Sliders,
  Check,
  Tag
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
  const { updateConfigLocally } = useShipping();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Configuration Form State
  const [formConfig, setFormConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);

  // Interactive Simulator State
  const [simSubtotal, setSimSubtotal] = useState<number>(4500);
  const [simPromoDiscount, setSimPromoDiscount] = useState<number>(0);

  // Fetch current Admin configuration
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await shippingAPI.getAdminConfig();
      if (res && res.data && res.data.config) {
        const loaded: ShippingConfig = {
          shippingFee: Number(res.data.config.shippingFee) || 0,
          freeShippingThreshold: Number(res.data.config.freeShippingThreshold) || 0,
          isFreeShippingEnabled: res.data.config.isFreeShippingEnabled !== false,
          isShippingEnabled: res.data.config.isShippingEnabled !== false,
          estimatedDeliveryDays: res.data.config.estimatedDeliveryDays || '5-7 business days',
        };
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
      if (res && res.data && res.data.config) {
        const updated: ShippingConfig = {
          shippingFee: Number(res.data.config.shippingFee) || 0,
          freeShippingThreshold: Number(res.data.config.freeShippingThreshold) || 0,
          isFreeShippingEnabled: res.data.config.isFreeShippingEnabled !== false,
          isShippingEnabled: res.data.config.isShippingEnabled !== false,
          estimatedDeliveryDays: res.data.config.estimatedDeliveryDays || '5-7 business days',
        };
        setFormConfig(updated);
        setSavedConfig(updated);
        updateConfigLocally(updated);
        showToast('Shipping configuration saved and applied across store!', 'success');
      }
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
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-neutral-100 font-medium">Shipping Configuration</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-3">
            <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Shipping & Free Delivery Manager
          </h1>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
            Centrally manage delivery fees, free-shipping thresholds, and auto-sync all storefront badges, cart calculations, and checkout totals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              type="button"
              onClick={() => setFormConfig({ ...savedConfig })}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !hasChanges}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm transition ${
              hasChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                : 'bg-gray-400 dark:bg-neutral-700 cursor-not-allowed opacity-60'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Top Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Standard Shipping Fee */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              Standard Shipping Fee
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
              Rs. {formConfig.shippingFee.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 dark:text-neutral-400">per order</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-neutral-400">
            <span className={`inline-block w-2 h-2 rounded-full ${formConfig.isShippingEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {formConfig.isShippingEnabled ? 'Shipping fees active' : '100% Free Shipping mode'}
          </div>
        </div>

        {/* Free Shipping Threshold */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              Free Shipping Threshold
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
              {formConfig.isFreeShippingEnabled ? `Rs. ${formConfig.freeShippingThreshold.toLocaleString()}` : 'Disabled'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-neutral-400">
            <span className={`inline-block w-2 h-2 rounded-full ${formConfig.isFreeShippingEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {formConfig.isFreeShippingEnabled ? 'Applies automatically above threshold' : 'Flat rate only'}
          </div>
        </div>

        {/* Delivery Timeframe */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              Delivery Timeframe
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 truncate">
              {formConfig.estimatedDeliveryDays || '5-7 business days'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
            Shown across product & checkout pages
          </div>
        </div>

        {/* System Sync Status */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              System Sync Status
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Realtime Active
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
            One single source of truth across 12 modules
          </div>
        </div>
      </div>

      {/* Main Content: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Shipping Rules & Fees
              </h2>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>

            {/* Global Shipping Toggle */}
            <div className="p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700/60 flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-neutral-100 block">
                  Enable Standard Shipping Charges
                </label>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  When enabled, orders will be charged the standard delivery fee unless they meet the free-shipping threshold. If disabled, all orders receive 100% free delivery.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={formConfig.isShippingEnabled}
                  onChange={(e) => setFormConfig({ ...formConfig, isShippingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Standard Shipping Fee Input */}
            <div className={`space-y-2 ${!formConfig.isShippingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                Standard Shipping Fee (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-neutral-400 text-sm font-semibold">
                  Rs.
                </div>
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
                  className="block w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="300"
                />
              </div>
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 dark:text-neutral-400">Quick Presets:</span>
                {[0, 200, 250, 300, 350, 400, 500].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setFormConfig({ ...formConfig, shippingFee: fee })}
                    className={`px-2.5 py-1 text-xs rounded-md border transition ${
                      formConfig.shippingFee === fee
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Rs. {fee}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Shipping Threshold Toggle */}
            <div className="p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700/60 flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-neutral-100 block">
                  Enable Free Shipping Threshold
                </label>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  When enabled, customers whose order total (after promo discounts) reaches this amount receive automatic free delivery.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={formConfig.isFreeShippingEnabled}
                  onChange={(e) => setFormConfig({ ...formConfig, isFreeShippingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Free Shipping Minimum Amount */}
            <div className={`space-y-2 ${!formConfig.isFreeShippingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                Free Shipping Threshold Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-neutral-400 text-sm font-semibold">
                  Rs.
                </div>
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
                  className="block w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="5000"
                />
              </div>
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 dark:text-neutral-400">Quick Presets:</span>
                {[3000, 4000, 5000, 6000, 7000, 8000, 10000].map((thr) => (
                  <button
                    key={thr}
                    type="button"
                    onClick={() => setFormConfig({ ...formConfig, freeShippingThreshold: thr })}
                    className={`px-2.5 py-1 text-xs rounded-md border transition ${
                      formConfig.freeShippingThreshold === thr
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Rs. {thr.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Delivery Timeframe Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
                Estimated Delivery Timeframe Description
              </label>
              <input
                type="text"
                value={formConfig.estimatedDeliveryDays}
                onChange={(e) => setFormConfig({ ...formConfig, estimatedDeliveryDays: e.target.value })}
                className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="5-7 business days"
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Displayed in product accordions, quick-view modals, cart sidebars, and invoices.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-800 flex justify-end">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg shadow transition ${
                  hasChanges
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    : 'bg-gray-400 dark:bg-neutral-700 cursor-not-allowed opacity-60'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* System Rules & Integrity Notice */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Guaranteed System Invariants & Order History Safety
            </h3>
            <ul className="text-xs text-indigo-800 dark:text-indigo-300/80 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Historical Orders Unchanged:</strong> Past orders permanently retain their stored shipping charge in invoices and customer history.
              </li>
              <li>
                <strong>Promo Code Interaction:</strong> Free shipping is evaluated <em>after</em> deducting promo code discounts.
              </li>
              <li>
                <strong>Independent Marquee Filtering:</strong> Only shipping announcements sync dynamically; marketing messages remain untouched.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Storefront Previews & Interactive Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Calculator Simulator */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-neutral-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Calculation Simulator
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                Test in Realtime
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-neutral-400">
              Test how the checkout engine evaluates shipping fees with different cart subtotals and promo codes.
            </p>

            {/* Subtotal Input Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-neutral-300">
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
                className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Rs. 500</span>
                <span>Rs. 7,500</span>
                <span>Rs. 15,000</span>
              </div>
            </div>

            {/* Promo Discount Input Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-neutral-300">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Promo Code Discount:
                </span>
                <span className="font-bold text-gray-900 dark:text-neutral-100">Rs. {simPromoDiscount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(simSubtotal, 5000)}
                step="100"
                value={simPromoDiscount}
                onChange={(e) => setSimPromoDiscount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Rs. 0</span>
                <span>Rs. 2,500</span>
                <span>Rs. 5,000</span>
              </div>
            </div>

            {/* Calculation Breakdown Box */}
            <div className="bg-gray-50 dark:bg-neutral-800/80 rounded-lg p-4 space-y-2.5 border border-gray-200 dark:border-neutral-700/80">
              <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400">
                <span>Subtotal</span>
                <span>Rs. {simSubtotal.toLocaleString()}</span>
              </div>

              {simPromoDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Promo Discount</span>
                  <span>- Rs. {simPromoDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-neutral-300 pt-1 border-t border-gray-200 dark:border-neutral-700">
                <span>Net Subtotal (for threshold)</span>
                <span>Rs. {simEffectiveSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-xs items-center">
                <span className="font-medium text-gray-700 dark:text-neutral-300">Shipping Fee</span>
                {isFreeEligible ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                    <Check className="w-3 h-3" />
                    FREE DELIVERY
                  </span>
                ) : (
                  <span className="font-bold text-gray-900 dark:text-neutral-100">
                    Rs. {simCalculatedShipping.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-neutral-100 pt-2 border-t border-gray-300 dark:border-neutral-600">
                <span>Estimated Customer Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Rs. {simFinalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Explanation badge */}
            <div className={`text-xs p-3 rounded-lg border ${
              isFreeEligible
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              {isFreeEligible ? (
                <span>
                  🎉 <strong>Qualifies for Free Shipping!</strong> Net subtotal of Rs. {simEffectiveSubtotal.toLocaleString()} is at or above the threshold of Rs. {formConfig.freeShippingThreshold.toLocaleString()}.
                </span>
              ) : (
                <span>
                  📦 <strong>Standard shipping applies:</strong> Net subtotal (Rs. {simEffectiveSubtotal.toLocaleString()}) is below the free shipping threshold of Rs. {formConfig.freeShippingThreshold.toLocaleString()}. Customer is <strong>Rs. {(formConfig.freeShippingThreshold - simEffectiveSubtotal).toLocaleString()}</strong> away from Free Delivery.
                </span>
              )}
            </div>
          </div>

          {/* Live Storefront Component Previews */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
              Customer Storefront Live Previews
            </h3>

            {/* Marquee Banner Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                Header Marquee / Announcement Banner:
              </span>
              <div className="bg-black text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center font-medium shadow-inner">
                {previewMarquee}
              </div>
            </div>

            {/* Product Page Badge Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                Product Page Shipping Badge:
              </span>
              <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-3 bg-gray-50 dark:bg-neutral-800/40 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-neutral-100">
                    {previewThresholdText}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-neutral-400">
                    Estimated delivery: {formConfig.estimatedDeliveryDays}
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Statement Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                Accordion & Checkout Policy Statement:
              </span>
              <div className="text-xs text-gray-600 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-gray-200 dark:border-neutral-700">
                {previewPolicyStatement}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminShipping;
