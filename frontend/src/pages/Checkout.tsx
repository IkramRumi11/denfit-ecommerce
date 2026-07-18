import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';

import { useCart } from '../context/CartContext';
import { TAX_FEATURE } from '../config/taxFeatureFlag';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, productsAPI } from '../api';
import { formatCurrency } from '../utils/formatCurrency';
import { getColorName } from '../utils/colorNames';
import { useToast } from '../context/ToastContext';

type PaymentMethod = 'cod';

export const Checkout: React.FC = () => {
  const { items, subtotal, shipping, tax, total, clearCart, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // Temporarily default to COD and restrict selection to COD only.
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cod');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

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
      for (const it of safeItems) {
        const prod = latestStocks[it.productId];
        if (!prod) continue;
        
        let availableStock = 0;
        if (Array.isArray(prod.stock) && prod.stock.length) {
          const match = prod.stock.find((s: any) => {
            if (!s) return false;
            const matchesColor = it.variantId
              ? String(s.colorTempId) === String(it.variantId)
              : (it.color ? String(s.colorTempId).toLowerCase().trim() === String(it.color).toLowerCase().trim() : true);
            
            let displaySize = s.sizeId;
            if (Array.isArray(prod.sizes) && prod.sizes.length) {
              const found = prod.sizes.find((sz: any) => sz.id === s.sizeId || sz.value === s.sizeId);
              if (found) displaySize = found.value || found.id;
            }
            const matchesSize = String(displaySize).toLowerCase().trim() === String(it.size).toLowerCase().trim();
            return matchesColor && matchesSize;
          });
          if (match && typeof match.quantity === 'number') availableStock = match.quantity;
        } else if (it.variantId && Array.isArray(prod.variants)) {
          const matchedVar = prod.variants.find((v: any) => String(v._id || v.id) === String(it.variantId));
          if (matchedVar && typeof matchedVar.inventory === 'number') availableStock = matchedVar.inventory;
        } else if (typeof prod.inventory === 'number') {
          availableStock = prod.inventory;
        }
        
        if (it.quantity > availableStock) {
          const colorName = it.colorName || (it.color ? getColorName(it.color) : 'Default');
          stockIssues.push(`${it.name} - Color: ${colorName}, Size: ${it.size} (Requested: ${it.quantity}, Available: ${availableStock})`);
        }
      }
      
      if (stockIssues.length > 0) {
        setServerErrors([
          'Some items in your cart are no longer available in the requested quantity. Please update your cart before checkout.',
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
        clearCart();
        setCreatedOrder(created);
        setIsComplete(true);
        // show confirmation and allow user to view order or continue shopping
        try {
          // small toast with order id
          // @ts-ignore
          window?.dispatchEvent?.(new CustomEvent('app:orderCreated', { detail: { orderId: created._id || created.id } }));
        } catch (e) {
          // ignore
        }
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

  // --- ORIGINAL EMPTY CART DESIGN ---
  if (itemsCount === 0 && !isComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Add some items to your cart before proceeding to checkout.
          </p>
          <Link
            to="/shop"
            className="btn-primary inline-block"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // --- ORIGINAL SUCCESS STATE DESIGN ---
  if (isComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          <p className="text-gray-600 mb-8">
            Order #: <span className="font-mono">{createdOrder ? (createdOrder.orderNumber || createdOrder._id || createdOrder.id) : `DENFIT-${Date.now()}`}</span>
          </p>
          <div className="space-y-3">
            <Link
              to="/shop"
              className="w-full btn-primary block"
            >
              Continue Shopping
            </Link>
            {createdOrder ? (
              <Link
                to={`/orders/${createdOrder._id || createdOrder.id}`}
                className="w-full btn-secondary block"
              >
                View Order
              </Link>
            ) : (
              <Link
                to="/orders"
                className="w-full btn-secondary block"
              >
                View Orders
              </Link>
            )}
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
                <ul className="list-disc pl-5">
                  {serverErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-700 font-medium">{err}</li>
                  ))}
                </ul>
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
                    <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
                        {/* COD confirmation */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-orange-50 border border-orange-100 rounded-xl p-6 text-center">
                           <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Truck className="h-6 w-6 text-orange-600" />
                           </div>
                           <h3 className="font-semibold text-gray-900 mb-1">Pay at your doorstep</h3>
                           <p className="text-sm text-gray-600">
                             Pay in cash upon delivery. Our courier will collect the payment.
                           </p>
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
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{String(item.name)}</h4>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>Size: <span className="font-medium text-gray-700">{String(item.size)}</span></div>
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
                                  let availableStock = 999;
                                  if (Array.isArray(prod.stock) && prod.stock.length) {
                                    const match = prod.stock.find((s: any) => {
                                      if (!s) return false;
                                      const matchesColor = item.variantId
                                        ? String(s.colorTempId) === String(item.variantId)
                                        : (item.color ? String(s.colorTempId).toLowerCase().trim() === String(item.color).toLowerCase().trim() : true);
                                      
                                      let displaySize = s.sizeId;
                                      if (Array.isArray(prod.sizes) && prod.sizes.length) {
                                        const found = prod.sizes.find((sz: any) => sz.id === s.sizeId || sz.value === s.sizeId);
                                        if (found) displaySize = found.value || found.id;
                                      }
                                      const matchesSize = String(displaySize).toLowerCase().trim() === String(item.size).toLowerCase().trim();
                                      return matchesColor && matchesSize;
                                    });
                                    if (match && typeof match.quantity === 'number') availableStock = match.quantity;
                                  } else if (item.variantId && Array.isArray(prod.variants)) {
                                    const matchedVar = prod.variants.find((v: any) => String(v._id || v.id) === String(item.variantId));
                                    if (matchedVar && typeof matchedVar.inventory === 'number') availableStock = matchedVar.inventory;
                                  } else if (typeof prod.inventory === 'number') {
                                    availableStock = prod.inventory;
                                  }
                                  
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

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">
                    {(shipping || 0) === 0 ? 'Free' : formatCurrency(shipping || 0)}
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
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(total || 0)}</span>
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