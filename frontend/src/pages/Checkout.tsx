import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CreditCard, Truck, Check } from 'lucide-react';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

export const Checkout: React.FC = () => {
  const { items, subtotal, shipping, tax, total, clearCart } = useCart();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Safe array access with fallbacks
  const safeItems = Array.isArray(items) ? items : [];
  const itemsCount = safeItems.length;

  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Pakistan'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    setStep(3);
    clearCart();
    setIsComplete(true);
  };

  if (itemsCount === 0 && !isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Add some items to your cart before proceeding to checkout.
          </p>
          <Link
            to="/shop"
            className="btn-primary"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          <p className="text-gray-600 mb-8">
            Order #: <span className="font-mono">DENFIT-{Date.now()}</span>
          </p>
          <div className="space-y-3">
            <Link
              to="/shop"
              className="w-full btn-primary block"
            >
              Continue Shopping
            </Link>
            <Link
              to="/profile/orders"
              className="w-full btn-secondary block"
            >
              View Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase securely</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                  step >= stepNumber
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-300'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-20 h-1 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                {!user ? (
                  // Guest Flow
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Truck className="h-6 w-6 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Shipping as Guest</h2>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Or <Link to="/auth?mode=login" className="text-blue-600 font-medium">sign in</Link> to use saved addresses.
                    </p>
                    <form onSubmit={handleShippingSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                          <input
                            id="fullName"
                            type="text"
                            required
                            value={shippingInfo.fullName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label htmlFor="checkoutEmail" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            id="checkoutEmail"
                            type="email"
                            required
                            value={shippingInfo.email}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="checkoutPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          id="checkoutPhone"
                          type="tel"
                          required
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label htmlFor="checkoutAddress" className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                          id="checkoutAddress"
                          type="text"
                          required
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="checkoutCity" className="block text-sm font-medium text-gray-700 mb-2">City</label>
                          <input
                            id="checkoutCity"
                            type="text"
                            required
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label htmlFor="checkoutPostalCode" className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                          <input
                            id="checkoutPostalCode"
                            type="text"
                            required
                            value={shippingInfo.postalCode}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label htmlFor="checkoutCountry" className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                          <select
                            id="checkoutCountry"
                            value={shippingInfo.country}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                            className="input-field"
                          >
                            <option value="Pakistan">Pakistan</option>
                          </select>
                        </div>
                      </div>

                      <input type="hidden" name="isGuest" value="true" />
                      <button type="submit" className="w-full btn-primary">Continue to Payment</button>
                    </form>
                  </div>
                ) : (
                  // Logged-in Flow
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Truck className="h-6 w-6 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
                    </div>
                    <h3 className="text-gray-700 font-medium mb-4">Saved Address</h3>
                    <p className="text-gray-600 mb-4">
                      You’re logged in as <span className="font-semibold">{user.name}</span>.  
                      You can use your saved address or enter a new one below.
                    </p>

                    <form onSubmit={handleShippingSubmit} className="space-y-4">
                      {/* Existing fields remain */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="shippingFullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                              id="shippingFullName"
                              type="text"
                            required
                            value={shippingInfo.fullName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                            <label htmlFor="shippingEmail" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                              id="shippingEmail"
                              type="email"
                            required
                            value={shippingInfo.email}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                          <label htmlFor="shippingPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            id="shippingPhone"
                            type="tel"
                          required
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                          <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                          <input
                            id="shippingAddress"
                            type="text"
                          required
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input
                              id="shippingCity"
                              type="text"
                            required
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                            <label htmlFor="shippingPostalCode" className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                            <input
                              id="shippingPostalCode"
                              type="text"
                            required
                            value={shippingInfo.postalCode}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                            <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                            <select
                              id="shippingCountry"
                              value={shippingInfo.country}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                            className="input-field"
                          >
                            <option value="Pakistan">Pakistan</option>
                          </select>
                        </div>
                      </div>

                      <button type="submit" className="w-full btn-primary">Continue to Payment</button>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input
                      id="cardNumber"
                      type="text"
                      required
                      placeholder="1234 5678 9012 3456"
                      value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                      <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                      <input
                        id="expiryDate"
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                      <input
                        id="cvv"
                        type="text"
                        required
                        placeholder="123"
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="nameOnCard" className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
                    <input
                      id="nameOnCard"
                      type="text"
                      required
                      value={paymentInfo.nameOnCard}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, nameOnCard: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      `Pay ${formatCurrency(total || 0)}`
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {safeItems.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Size: {item.size} × {item.quantity}
                      </p>
                      <p className="text-gray-900 font-medium">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {(shipping || 0) === 0 ? 'Free' : formatCurrency(shipping || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(tax || 0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total || 0)}</span>
                  </div>
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
    </div>
  );
};

export default Checkout;
