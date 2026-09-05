import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Truck, 
  Check, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  ShieldCheck,
  Minus,
  Plus,
  Package,
  ArrowRight,
  ShoppingBag,
  Tag
} from 'lucide-react';

import { useCart } from '../context/CartContext';
import { TAX_FEATURE } from '../config/taxFeatureFlag';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, productsAPI } from '../api';
import { formatCurrency } from '../utils/formatCurrency';
import { getColorName } from '../utils/colorNames';
import { getAvailableStockForItem } from '../utils/stockHelpers';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useShipping } from '../context/ShippingContext';

type PaymentMethod = 'cod';

export const Checkout: React.FC = () => {
  const { items, subtotal, tax, clearCart, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const { shippingConfig, calculateShippingFee } = useShipping();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // Temporarily default to COD and restrict selection to COD only.
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cod');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [stockIssuesList, setStockIssuesList] = useState<Array<{ item: any; availableStock: number }>>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const effectiveSubtotal = Math.max(0, (subtotal || 0) - promoDiscount);
  const calculatedShipping = calculateShippingFee(effectiveSubtotal);
  const calculatedTotal = effectiveSubtotal + calculatedShipping + (tax || 0);

  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      if (code.startsWith('DF-CREDIT-')) {
        const res: any = await ordersAPI.validateStoreCredit(code, subtotal || 0);
        const isValid = Boolean(res?.valid || res?.data?.valid || res?.success);
        if (isValid) {
          const discount = Number(res?.discountAmount ?? res?.data?.discountAmount ?? 0);
          setAppliedPromo({ code, isStoreCredit: true, remainingBalance: res?.storeCredit?.remainingBalance || res?.data?.storeCredit?.remainingBalance });
          setPromoDiscount(discount);
          showToast(`Store credit voucher "${code}" applied (Rs ${discount.toLocaleString()})!`, 'success');
          return;
        } else {
          setPromoError(res?.message || 'Invalid or expired store credit voucher');
          return;
        }
      }

      const res: any = await ordersAPI.validatePromo(code, subtotal || 0);
      const isSuccess = Boolean(res?.valid || res?.success || res?.data?.valid);
      if (isSuccess) {
        const promo = res?.data?.promoCode || res?.promoCode || res?.data || { code };
        const discount = Number(
          res?.data?.calculatedDiscount ??
          res?.data?.discountAmount ??
          res?.calculatedDiscount ??
          res?.discountAmount ??
          0
        );
        setAppliedPromo(promo);
        setPromoDiscount(discount);
        showToast(`Promo code "${code}" applied!`, 'success');
      } else {
        // Fallback: try store credit validation in case prefix differs
        const creditRes: any = await ordersAPI.validateStoreCredit(code, subtotal || 0);
        const isCreditValid = Boolean(creditRes?.valid || creditRes?.data?.valid || creditRes?.success);
        if (isCreditValid) {
          const discount = Number(creditRes?.discountAmount ?? creditRes?.data?.discountAmount ?? 0);
          setAppliedPromo({ code, isStoreCredit: true });
          setPromoDiscount(discount);
          showToast(`Store credit voucher "${code}" applied!`, 'success');
        } else {
          setPromoError(res?.message || 'Invalid promo code or store credit voucher');
        }
      }
    } catch (err: any) {
      setPromoError(err?.message || 'Failed to apply promo or voucher code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCodeInput('');
    setPromoError(null);
    showToast('Code removed', 'info');
  };

  // Safe array access with fallbacks
  const safeItems = Array.isArray(items) ? items : [];
  const displayItems = safeItems.map(it => {
    const colorObj = it?.color && typeof it.color === 'object' ? it.color : null;
    const colorName = it?.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
    const variantHex = it?.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
    const variantName = it?.variantName || undefined;
    const colorValue = typeof it?.color === 'string' ? it.color : (variantHex || undefined);

    return {
      productId: String(it?.productId ?? ''),
      name: String(it?.name ?? ''),
      image: (typeof it?.image === 'string') ? it.image : (it?.image?.url || it?.image?.src || ''),
      price: Number(it?.price) || 0,
      size: it?.size == null ? '' : (typeof it.size === 'object' ? String(it.size.value ?? it.size.size ?? it.size.label ?? it.size.name ?? JSON.stringify(it.size)) : String(it.size)),
      quantity: Number(it?.quantity) || 1,
      color: colorValue,
      colorName,
      variantName,
      variantHex
    };
  });
  const itemsCount = safeItems.length;

  // Scroll to top on initial mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Scroll to top when order is complete or component renders complete
  useEffect(() => {
    if (isComplete) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [isComplete]);

  // Validate live inventory on initial render / cart change
  useEffect(() => {
    let mounted = true;
    const validateLiveInventory = async () => {
      if (!safeItems.length) return;
      try {
        const uniqueProductIds = Array.from(new Set(safeItems.map(it => it.productId).filter(Boolean)));
        const results = await Promise.all(
          uniqueProductIds.map(id => productsAPI.getById(id).catch(() => null))
        );
        const latestStocks: Record<string, any> = {};
        results.forEach((res: any) => {
          const prod = res && (res.product || res.data?.product || res);
          if (prod) {
            latestStocks[String(prod._id || prod.id)] = prod;
            if (prod._id) latestStocks[String(prod._id)] = prod;
            if (prod.id) latestStocks[String(prod.id)] = prod;
          }
        });

        const issues: Array<{ item: any; availableStock: number }> = [];
        for (const it of safeItems) {
          const prod = latestStocks[it.productId];
          if (!prod) continue;
          const availableStock = getAvailableStockForItem(prod, {
            size: it.size,
            color: it.color,
            colorName: it.colorName,
            variantId: it.variantId,
            variantName: it.variantName,
            variantHex: it.variantHex
          });
          if (it.quantity > availableStock) {
            issues.push({ item: it, availableStock });
          }
        }
        if (mounted) {
          setStockIssuesList(issues);
        }
      } catch (e) {
        // ignore
      }
    };
    validateLiveInventory();
    return () => { mounted = false; };
  }, [safeItems.map(i => `${i.productId}-${i.size}-${i.color}-${i.quantity}`).join(',')]);

  const handleAutoAdjustQuantities = () => {
    stockIssuesList.forEach(({ item, availableStock }) => {
      if (availableStock <= 0) {
        removeItem(item.productId, item.size, item.color);
      } else {
        updateQuantity(item.productId, item.size, availableStock, item.color, availableStock);
      }
    });
    setStockIssuesList([]);
    setServerErrors([]);
    showToast('Cart quantities synchronized with current available stock', 'success');
  };

  // --- FORM STATE ---
  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan'
  });

  const [validationErrorsMap, setValidationErrorsMap] = useState<Record<string,string>>({});

  // Validation utilities
  const nameRegex = /^[A-Za-z ]+$/;
  // Accept either: an international-style number starting with '+' plus 12 digits (total length 13),
  // or a local Pakistan-style number starting with '03' followed by 9 digits (total length 11).
  const phoneRegex = /^(\+\d{12}|03\d{9})$/; // +xxxxxxxxxxxx (13 chars) or 03xxxxxxxxx (11 chars)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const postalRegex = /^\d*$/;

  const validateField = (key: string, value: string) => {
    let msg = '';
    switch (key) {
      case 'fullName':
        if (!value || value.trim().length < 3) msg = 'Full name must be at least 3 characters';
        else if (!nameRegex.test(value)) msg = 'Full name may only contain letters and spaces';
        break;
      case 'phone':
        if (!value || value.trim() === '') msg = 'Phone number is required';
        else if (!phoneRegex.test(value)) msg = 'Phone must be + followed by 12 digits (13 chars) or start with 03 and be 11 digits';
        break;
      case 'email':
        if (!value || value.trim() === '') msg = 'Email is required';
        else if (!emailRegex.test(value)) msg = 'Enter a valid email address';
        break;
      case 'address':
        if (!value || value.trim().length < 20) msg = 'Please enter a valid and complete shipping address.';
        break;
      case 'city':
        if (!value || value.trim() === '') msg = 'City is required';
        break;
      case 'state':
        if (!value || value.trim() === '') msg = 'State / Province is required';
        break;
      case 'postalCode':
        if (value && !postalRegex.test(value)) msg = 'Postal code must contain only digits';
        break;
      default:
        break;
    }
    setValidationErrorsMap(prev => ({ ...prev, [key]: msg }));
    return msg === '';
  };

  const validateAllShipping = () => {
    const checks = [
      validateField('fullName', shippingInfo.fullName),
      validateField('phone', shippingInfo.phone),
      validateField('email', shippingInfo.email),
      validateField('address', shippingInfo.address),
      validateField('state', shippingInfo.state),
      validateField('city', shippingInfo.city),
      validateField('postalCode', shippingInfo.postalCode || '')
    ];
    return checks.every(Boolean);
  };

  const [serverErrorsRaw, setServerErrorsRaw] = useState<any>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const fieldError = (fieldKey: string) => {
    if (!serverErrorsRaw) return null;
    // If server returned array of messages, find one containing the fieldKey
    if (Array.isArray(serverErrorsRaw)) {
      const found = serverErrorsRaw.find((e) => e.includes(fieldKey));
      return found || null;
    }
    // If server returned structured object, traverse it by path
    if (typeof serverErrorsRaw === 'object') {
      const getNested = (obj: any, path: string) => {
        const parts = path.split('.');
        let cur: any = obj;
        for (let p of parts) {
          const arrMatch = p.match(/(.+)\[(\d+)\]$/);
          if (arrMatch) {
            const k = arrMatch[1];
            const idx = Number(arrMatch[2]);
            cur = cur && cur[k];
            if (!Array.isArray(cur)) return null;
            cur = cur[idx];
          } else {
            cur = cur && cur[p];
          }
          if (cur == null) return null;
        }
        if (Array.isArray(cur)) return cur.join('; ');
        return String(cur);
      };
      return getNested(serverErrorsRaw, fieldKey) || null;
    }
    return null;
  };

  // COD is the only supported payment method — no card/wallet validation needed
  const handleValidation = () => {
    return true;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear server errors
    setServerErrors([]);
    // Run client-side validations
    const ok = validateAllShipping();
    if (!ok) {
      // scroll to first validation error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setIsProcessing(true);
    setServerErrorsRaw(null);
    setServerErrors([]);
    
    // --- Pre-validation Stock Check ---
    try {
      const uniqueProductIds = Array.from(new Set(safeItems.map(it => it.productId)));
      const results = await Promise.all(
        uniqueProductIds.map(id => productsAPI.getById(id))
      );
      
      const latestStocks: Record<string, any> = {};
      results.forEach(res => {
        const prod = res && (res.product || (res as any).data?.product || res);
        if (prod) {
          latestStocks[String(prod._id || prod.id)] = prod;
        }
      });
      
      const stockIssues: string[] = [];
      const structuredIssues: Array<{ item: any; availableStock: number }> = [];
      for (const it of safeItems) {
        const prod = latestStocks[it.productId];
        if (!prod) continue;
        
        const availableStock = getAvailableStockForItem(prod, {
          size: it.size,
          color: it.color,
          colorName: it.colorName,
          variantId: it.variantId,
          variantName: it.variantName,
          variantHex: it.variantHex
        });
        
        if (it.quantity > availableStock) {
          const colorName = it.colorName || (it.color ? getColorName(it.color) : 'Default');
          stockIssues.push(`${it.name} - Color: ${colorName}, Size: ${it.size} (Requested: ${it.quantity}, Available: ${availableStock})`);
          structuredIssues.push({ item: it, availableStock });
        }
      }
      
      if (stockIssues.length > 0) {
        setStockIssuesList(structuredIssues);
        setServerErrors([
          'Some items in your cart have limited stock. Click the button below to adjust your cart to available stock:',
          ...stockIssues
        ]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsProcessing(false);
        return;
      }
    } catch (e) {
      console.warn('Pre-checkout stock validation check failed, falling back to server-side check:', e);
    }

    // Build order payload expected by backend
    try {
      const payload = {
        items: safeItems.map((it) => ({
          product: it.productId,
          name: it.name,
          image: it.image,
          price: it.price,
          size: it.size,
          quantity: it.quantity,
          color: it.color || undefined,
          colorName: it.colorName || (it.color && typeof it.color === 'object' ? (it.color.name || undefined) : (typeof it.color === 'string' ? it.color : undefined))
        })),
        shippingAddress: {
          name: shippingInfo.fullName,
          street: shippingInfo.address,
          city: shippingInfo.city,
          email: shippingInfo.email,
          state: shippingInfo.state,
          zipCode: shippingInfo.postalCode,
          country: shippingInfo.country,
          phone: shippingInfo.phone
        },
        promoCode: appliedPromo?.code && !appliedPromo?.isStoreCredit ? appliedPromo.code.toUpperCase() : undefined,
        storeCreditCode: appliedPromo?.code && appliedPromo?.isStoreCredit ? appliedPromo.code.toUpperCase() : undefined,
        // Explicit customer identity fields to help backend distinguish guest vs account orders
        customerEmail: shippingInfo.email || null,
        userId: user?.id || user?._id || null,
        guest: !user,
        // NOTE: Do NOT request an account email update during checkout. The contact
        // email provided at checkout is stored on the Order only and must not
        // overwrite the user's profile email used for authentication.
        paymentMethod: 'cash_on_delivery'
      };

      const res: any = await ordersAPI.create(payload as any);
      if (res && res.success && res.data && res.data.order) {
        const created = res.data.order;
        const ordId = created.orderNumber || created._id || created.id;
        
        clearCart();
        setCreatedOrder(created);
        setIsComplete(true);
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;

        // Trigger Success Toast
        showToast(`Order #${ordId} placed successfully!`, 'success', 6000);

        // Add in-app notification
        try {
          addNotification({
            title: 'Order Confirmed',
            message: `Your order #${ordId} for Rs ${Number(created.total || total).toLocaleString()} has been placed successfully.`,
            type: 'order',
            orderId: created._id || created.id
          });
        } catch (e) {}

        try {
          // @ts-expect-error custom event is not typed on window object
          window?.dispatchEvent?.(new CustomEvent('app:orderCreated', { detail: { orderId: created._id || created.id } }));
        } catch (e) {}
        return;
      } else {
        throw new Error(res?.message || 'Order creation failed');
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      // If server attached validation details, surface them in the UI
      const details = err && err.details ? err.details : null;
      setServerErrorsRaw(details);
      let messages: string[] = [];
      if (Array.isArray(details)) messages = details;
      else if (details && typeof details === 'object') {
        const flatten: string[] = [];
        const recurse = (x: any) => {
          if (Array.isArray(x)) x.forEach((i) => recurse(i));
          else if (x && typeof x === 'object') Object.values(x).forEach((v) => recurse(v));
          else if (x) flatten.push(String(x));
        };
        recurse(details);
        messages = flatten;
      } else if (typeof details === 'string') messages = [details];
      else if (err?.message) messages = [err.message];
      else messages = ['Failed to create order. Please contact support.'];

      setServerErrors(messages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsProcessing(false);
      return;
    }
  };

  // --- EMPTY CART VIEW ---
  if (itemsCount === 0 && !isComplete) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-start justify-center pt-20 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-8 text-sm">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link
            to="/shop"
            className="w-full btn-primary inline-block py-3"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // --- ORDER CONFIRMATION VIEW (TOP-ALIGNED & RESPONSIVE) ---
  if (isComplete) {
    const orderNum = createdOrder ? (createdOrder.orderNumber || createdOrder._id || createdOrder.id) : `DENFIT-${Date.now()}`;
    const orderTotal = createdOrder?.total || total;
    const shippingTarget = createdOrder?.shippingAddress || shippingInfo;

    return (
      <div className="min-h-screen bg-gray-50/40 pt-8 md:pt-14 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-center text-white">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Check className="h-9 w-9 text-white stroke-[2.5]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Confirmed!</h1>
              <p className="text-green-100 text-sm mt-1.5 max-w-sm mx-auto">
                Thank you for your purchase. We have received your order and are preparing it for delivery.
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Order Number & Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Order Reference</span>
                  <span className="font-mono font-bold text-gray-900 text-base md:text-lg">#{orderNum}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse" />
                    Confirmed (COD)
                  </span>
                </div>
              </div>

              {/* Order Summary Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border border-gray-100 space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Delivery Address</span>
                  <p className="font-medium text-gray-900">{shippingTarget?.fullName || user?.name || 'Customer'}</p>
                  <p className="text-gray-600">{shippingTarget?.address}</p>
                  <p className="text-gray-600">{shippingTarget?.city}{shippingTarget?.state ? `, ${shippingTarget.state}` : ''}</p>
                  <p className="text-gray-500 text-xs mt-1">📞 {shippingTarget?.phone}</p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Payment & Total</span>
                  <p className="text-gray-600">Method: <span className="font-medium text-gray-900">Cash on Delivery</span></p>
                  <p className="text-gray-600">Estimated Delivery: <span className="font-medium text-gray-900">5–7 Days (7–9 Days for Sale items)</span></p>
                  <p className="text-[11px] text-gray-400 leading-tight">Delivery may be affected by weather conditions, disasters, local restrictions, service unavailability, or other circumstances beyond our control.</p>
                  {createdOrder?.discountAmount > 0 && (
                    <p className="text-emerald-600 text-sm font-medium pt-1">
                      Promo Discount {createdOrder.promoCode ? `(${createdOrder.promoCode})` : ''}: -{formatCurrency(createdOrder.discountAmount)}
                    </p>
                  )}
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <span className="text-xs text-gray-500">Total Payable Amount:</span>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(orderTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="text-xs text-gray-500 text-center bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                ✉️ A confirmation message has been recorded. You can track your order status anytime from your profile.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {createdOrder ? (
                  <Link
                    to={`/orders/${createdOrder._id || createdOrder.id}`}
                    className="flex-1 py-3 px-4 rounded-lg bg-gray-900 text-white font-medium text-center hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Package className="h-4 w-4" /> View Order Details
                  </Link>
                ) : (
                  <Link
                    to="/orders"
                    className="flex-1 py-3 px-4 rounded-lg bg-gray-900 text-white font-medium text-center hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Package className="h-4 w-4" /> View My Orders
                  </Link>
                )}
                <Link
                  to="/shop"
                  className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  Continue Shopping <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ENHANCED MAIN CHECKOUT FORM ---
  return (
    <div className="min-h-screen bg-white py-8 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>Secure Checkout System</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Steps */}
          <div className="lg:col-span-8 space-y-6">
            {serverErrors.length > 0 && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <ul className="list-disc pl-5 mb-3">
                  {serverErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-700 font-medium">{err}</li>
                  ))}
                </ul>
                {stockIssuesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoAdjustQuantities}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Adjust Cart to Available Stock
                  </button>
                )}
              </div>
            )}
            
            {/* Step 1: Shipping */}
            <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${step === 1 ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 1 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                      {step > 1 ? <Check className="h-5 w-5" /> : '1'}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Shipping Details</h2>
                  </div>
                  {step > 1 && (
                    <button
                      onClick={() => {
                        setStep(1);
                        window.scrollTo(0, 0);
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {step === 1 && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleShippingSubmit}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="label-text">Full Name</label>
                           <input 
                             type="text" 
                             required 
                             placeholder="Enter your full name"
                             className="input-field" 
                             value={shippingInfo.fullName}
                             onChange={e => {
                               // Allow only letters and spaces while typing
                               const filtered = e.target.value.replace(/[^A-Za-z ]/g, '');
                               setShippingInfo({...shippingInfo, fullName: filtered});
                               validateField('fullName', filtered);
                             }}
                           />
                            {fieldError('shippingAddress.name') && (
                              <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.name')}</p>
                            )}
                           {validationErrorsMap.fullName && (
                             <p className="text-xs text-red-600 mt-1">{validationErrorsMap.fullName}</p>
                           )}
                         </div>
                         <div>
                           <label className="label-text">Phone Number</label>
                           <input 
                             type="tel" 
                             required 
                             placeholder="+92XXXXXXXXXX or 03XXXXXXXXX"
                             className="input-field" 
                             value={shippingInfo.phone}
                             onChange={e => {
                               // Allow only digits and a single leading plus
                               let v = e.target.value.replace(/[^0-9+]/g, '');
                               // Normalize plus: only allow at start
                               const plusCount = (v.match(/\+/g) || []).length;
                               if (plusCount > 1) v = v.replace(/\+/g, '');
                               if (v.length > 0 && v[0] !== '+') v = v.replace(/\+/g, '');
                               // If starts with plus, limit to 13 chars (+ + 12 digits), otherwise limit to 11 chars
                               if (v.startsWith('+')) v = v.slice(0, 13);
                               else v = v.slice(0, 11);
                               setShippingInfo({...shippingInfo, phone: v});
                               validateField('phone', v);
                             }}
                           />
                             {fieldError('shippingAddress.phone') && (
                               <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.phone')}</p>
                             )}
                            {validationErrorsMap.phone && (
                              <p className="text-xs text-red-600 mt-1">{validationErrorsMap.phone}</p>
                            )}
                         </div>
                         <div className="md:col-span-2">
                           <label className="label-text">Email Address</label>
                           <input 
                             type="email" 
                             required 
                             placeholder="example@gmail.com"
                             className="input-field" 
                             value={shippingInfo.email}
                             onChange={e => {
                               const v = e.target.value;
                               setShippingInfo({...shippingInfo, email: v});
                               validateField('email', v);
                             }}
                           />
                          {validationErrorsMap.email && (
                            <p className="text-xs text-red-600 mt-1">{validationErrorsMap.email}</p>
                          )}
                         </div>
                         <div>
                           <label className="label-text">State / Province</label>
                           <input
                             type="text"
                             required
                             placeholder="Enter your province"
                             className="input-field"
                             value={shippingInfo.state}
                             onChange={e => { const v = e.target.value; setShippingInfo({...shippingInfo, state: v}); validateField('state', v); }}
                           />
                          {fieldError('shippingAddress.state') && (
                            <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.state')}</p>
                          )}
                         </div>
                         <div className="md:col-span-2">
                           <label className="label-text">Street Address</label>
                           <input 
                             type="text" 
                             required 
                             placeholder="Enter your complete address"
                             className="input-field" 
                             value={shippingInfo.address}
                             onChange={e => { const v = e.target.value; setShippingInfo({...shippingInfo, address: v}); validateField('address', v); }}
                           />
                           {fieldError('shippingAddress.street') && (
                             <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.street')}</p>
                           )}
                          {validationErrorsMap.address && (
                            <p className="text-xs text-red-600 mt-1">{validationErrorsMap.address}</p>
                          )}
                         </div>
                         <div>
                           <label className="label-text">City</label>
                           <input 
                             type="text" 
                             required 
                             placeholder="Enter your city"
                             className="input-field" 
                             value={shippingInfo.city}
                             onChange={e => { const v = e.target.value; setShippingInfo({...shippingInfo, city: v}); validateField('city', v); }}
                           />
                          {fieldError('shippingAddress.city') && (
                            <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.city')}</p>
                          )}
                         {validationErrorsMap.city && (
                           <p className="text-xs text-red-600 mt-1">{validationErrorsMap.city}</p>
                         )}
                         </div>
                         <div>
                           <label className="label-text">Postal Code</label>
                           <input 
                             type="text" 
                             placeholder="Postal code (optional)"
                             className="input-field" 
                             value={shippingInfo.postalCode}
                             onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setShippingInfo({...shippingInfo, postalCode: v}); validateField('postalCode', v); }}
                           />
                           {fieldError('shippingAddress.zipCode') && (
                             <p className="text-xs text-red-600 mt-1">{fieldError('shippingAddress.zipCode')}</p>
                           )}
                          {validationErrorsMap.postalCode && (
                            <p className="text-xs text-red-600 mt-1">{validationErrorsMap.postalCode}</p>
                          )}
                         </div>
                         <div>
                            <label className="label-text">Country</label>
                            <select 
                              className="input-field bg-gray-50" 
                              value={shippingInfo.country}
                              onChange={e => setShippingInfo({...shippingInfo, country: e.target.value})}
                            >
                              <option value="Pakistan">Pakistan</option>
                            </select>
                         </div>
                      </div>
                      <div className="pt-4">
                        <button type="submit" className="btn-primary w-full md:w-auto px-8">
                          Continue to Payment
                        </button>
                      </div>
                    </motion.form>
                  )}
                  {step === 2 && (
                    <div className="text-gray-600 text-sm ml-12">
                      <p>{shippingInfo.fullName}, {shippingInfo.phone}</p>
                      <p>{shippingInfo.address}, {shippingInfo.city}, {shippingInfo.country}</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Step 2: Payment */}
            <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${step === 2 ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'}`}>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    2
                  </div>
                  <h2 className={`text-xl font-semibold ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}>Payment Method</h2>
                </div>

                <AnimatePresence>
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* Payment Method — Only COD available. Card and wallet inputs removed for PCI compliance. */}
                      <div className="mb-8">
                        {/* COD — Active */}
                        <div 
                          className="cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all border-orange-600 bg-orange-50 ring-1 ring-orange-600 mb-3"
                        >
                          <div className="flex items-center gap-2">
                            <input type="radio" checked readOnly className="accent-orange-600" />
                            <Banknote className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <span className="font-medium text-sm text-gray-900">Cash on Delivery</span>
                            <p className="text-xs text-gray-500 mt-0.5">Pay in cash when your order arrives</p>
                          </div>
                        </div>

                        {/* Credit/Debit Card — Coming Soon (no inputs) */}
                        <div
                          className="rounded-xl border border-gray-200 p-4 flex items-center gap-4 opacity-50 cursor-not-allowed mb-3"
                        >
                          <div className="flex items-center gap-2">
                            <input type="radio" disabled className="accent-gray-300" />
                            <CreditCard className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-sm text-gray-500">Credit / Debit Card</span>
                          </div>
                          <span className="inline-block bg-yellow-50 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-yellow-200">Coming Soon</span>
                        </div>

                        {/* Mobile Wallet — Coming Soon (no inputs) */}
                        <div
                          className="rounded-xl border border-gray-200 p-4 flex items-center gap-4 opacity-50 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-2">
                            <input type="radio" disabled className="accent-gray-300" />
                            <Smartphone className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-sm text-gray-500">Mobile Wallet (JazzCash / Easypaisa)</span>
                          </div>
                          <span className="inline-block bg-yellow-50 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-yellow-200">Coming Soon</span>
                        </div>
                      </div>

                      <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-orange-50 border border-orange-100 rounded-xl p-6 text-center">
                           <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Truck className="h-6 w-6 text-orange-600" />
                           </div>
                           <h3 className="font-semibold text-gray-900 mb-1">Pay at your doorstep</h3>
                           <p className="text-sm text-gray-600 mb-3">
                             Pay in cash upon delivery. Our courier will collect the payment.
                           </p>
                           <div className="text-xs text-gray-600 bg-white/80 rounded-lg p-3 border border-orange-200/60 text-left space-y-1">
                             <div className="font-medium text-gray-800">🚚 Standard Delivery: <span className="font-semibold text-gray-900">{shippingConfig.estimatedDeliveryDays || '5–7 working days'}</span></div>
                             <div>⚡ Sale Items Delivery: <span className="font-semibold text-gray-900">7–9 working days</span> (depending on sale volume)</div>
                             <div className="text-[11px] text-gray-500 pt-1 border-t border-orange-100">
                               Note: Delivery may be affected by weather conditions, disasters, local restrictions, service unavailability, or other circumstances beyond our control.
                             </div>
                           </div>
                        </motion.div>

                        <button 
                          type="submit" 
                          disabled={isProcessing}
                          className={`w-full btn-primary py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed`}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                              Processing...
                            </span>
                          ) : (
                            <span>Place your Order</span>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {displayItems.map((item) => (
                  <div key={`${String(item.productId)}-${String(item.size)}-${String(item.colorName || item.color || '')}`} className="flex gap-3 py-2">
                    <img 
                      src={String(item.image)} 
                      alt={String(item.name)} 
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100" 
                    />
                    <div className="flex-1 min-w-0">
                      {(item.brand || (item.product && item.product.brand)) && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                          {item.brand || (item.product && item.product.brand)}
                        </p>
                      )}
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{String(item.name)}</h4>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>{/ml$/i.test(String(item.size || '').trim()) ? 'Volume:' : 'Size:'} <span className="font-medium text-gray-700">{String(item.size)}</span></div>
                        {(() => {
                          const variantLabel = item.variantName || item.colorName || '';
                          const colorValue = item.variantHex || item.color || '';
                          const label = variantLabel || colorValue;
                          if (!label) return null;
                          const friendlyName = getColorName(label);
                          return (
                            <div className="mt-1 flex items-center gap-2">
                              {colorValue ? (
                                <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: String(colorValue) }} />
                              ) : null}
                              <span className="text-sm text-gray-600">Color: <span className="font-medium text-gray-700 capitalize">{friendlyName}</span></span>
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantity(item.productId, item.size, item.quantity - 1, item.color);
                              } else {
                                removeItem(item.productId, item.size, item.color);
                                showToast('Item removed from cart', 'info');
                              }
                            }}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3 w-3 text-gray-600" />
                          </button>
                          <span className="text-sm font-medium px-1.5">{item.quantity}</span>
                          <button
                            onClick={async () => {
                              try {
                                const res = await productsAPI.getById(item.productId);
                                const prod = res && (res.product || (res as any).data?.product || res);
                                if (prod) {
                                  const availableStock = getAvailableStockForItem(prod, {
                                    size: item.size,
                                    color: item.color,
                                    colorName: item.colorName,
                                    variantId: item.variantId,
                                    variantName: item.variantName,
                                    variantHex: item.variantHex
                                  });
                                  
                                  if (item.quantity >= availableStock) {
                                    showToast(`Only ${availableStock} items are available for this variant.`, 'error');
                                    return;
                                  }
                                }
                                updateQuantity(item.productId, item.size, item.quantity + 1, item.color);
                              } catch (e) {
                                updateQuantity(item.productId, item.size, item.quantity + 1, item.color);
                              }
                            }}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promotional Code */}
              <div className="border-t border-gray-100 mt-4 pt-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Promo Code</span>
                </label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-700 uppercase">{appliedPromo.code}</span>
                      <span className="text-xs text-emerald-600">
                        ({appliedPromo.discountType === 'percentage' ? `${appliedPromo.discountAmount}% off` : `Rs ${appliedPromo.discountAmount} off`})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-xs font-medium text-red-600 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        className="flex-1 text-sm uppercase rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoCodeInput.trim() || isApplyingPromo}
                        className="btn-secondary px-3 py-2 text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApplyingPromo ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-600 mt-1.5">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal || 0)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount {appliedPromo?.code ? `(${appliedPromo.code})` : ''}</span>
                    <span>-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span>Shipping</span>
                    {promoDiscount > 0 &&
                      shippingConfig.isFreeShippingEnabled &&
                      effectiveSubtotal < shippingConfig.freeShippingThreshold &&
                      (subtotal || 0) >= shippingConfig.freeShippingThreshold && (
                        <span className="text-[11px] text-amber-600">
                          Subtotal after discount &lt; {formatCurrency(shippingConfig.freeShippingThreshold)}
                        </span>
                    )}
                  </div>
                  <span className={calculatedShipping === 0 ? "text-green-600 font-medium" : "font-medium text-gray-900"}>
                    {calculatedShipping === 0 ? 'Free' : formatCurrency(calculatedShipping)}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(tax || 0)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                Secure SSL encryption
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Styles to maintain new input look while keeping old buttons */}
      <style>{`
        .label-text {
          @apply block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide;
        }
        .input-field {
          @apply w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors py-2.5 px-3 text-gray-900 bg-white border;
        }
        /* Ensuring btn-primary matches your project's global style or fallback */
        .btn-primary {
          @apply bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors text-center;
        }
        .btn-secondary {
          @apply bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-semibold rounded-lg px-6 py-3 transition-colors text-center;
        }
      `}</style>
    </div>
  );
};

export default Checkout;