import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CreditCard, Clock, ArrowRightLeft, Gift, CheckCircle2, AlertCircle } from 'lucide-react';
import { ordersAPI } from '../api';
import TrackingLink from '../components/TrackingLink';
import { formatCurrency } from '../utils/formatCurrency';
import { formatLabel } from '../utils/formatLabel';
import { getColorName } from '../utils/colorNames';
import { useToast } from '../context/ToastContext';

const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exchange modal state
  const [exchangeModal, setExchangeModal] = useState<{
    open: boolean;
    itemId?: string;
    itemName?: string;
    currentSize?: string;
    currentColor?: string;
  }>({ open: false });
  const [exchangeReason, setExchangeReason] = useState<string>('Size too small');
  const [desiredSize, setDesiredSize] = useState<string>('');
  const [desiredColor, setDesiredColor] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [submittingExchange, setSubmittingExchange] = useState<boolean>(false);

  const loadOrder = (orderId: string) => {
    setLoading(true);
    setError(null);
    ordersAPI.getById(orderId)
      .then((res: any) => {
        setOrder(res?.order || res?.data?.order || null);
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load order');
      })
      .finally(() => { setLoading(false); });
  };

  useEffect(() => {
    if (!id) {
      setError('No order id provided');
      setLoading(false);
      return;
    }
    loadOrder(id);
  }, [id]);

  const handleRequestExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !exchangeModal.itemId) return;
    setSubmittingExchange(true);
    try {
      const res = await ordersAPI.requestItemExchange(order._id, exchangeModal.itemId, {
        reason: exchangeReason,
        desiredSize: desiredSize || undefined,
        desiredColor: desiredColor || undefined,
        customerNote: customerNote || undefined,
      });
      if (res?.data?.order || res?.order) {
        setOrder(res?.data?.order || res?.order);
        showToast('Exchange request submitted successfully. Our team will review it shortly!', 'success');
        setExchangeModal({ open: false });
      }
    } catch (err: any) {
      console.error('Failed to submit exchange request:', err);
      showToast(err?.message || 'Failed to request exchange', 'error');
    } finally {
      setSubmittingExchange(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading order...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center">Order not found</div>;

  // Check if order is eligible for exchange (delivered within 14 days)
  const isDelivered = order.status === 'delivered';
  const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt);
  const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
  const isEligibleForExchange = isDelivered && daysSinceDelivery <= 14;

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Order Details</h1>
            <p className="text-sm text-slate-500">Order #{order.orderNumber || order._id}</p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 self-start sm:self-auto"
          >
            &larr; Back to all orders
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-xs text-slate-400">Placed on</div>
              <div className="font-semibold text-slate-800">{new Date(order.createdAt || order.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Status</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                {order.status}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-900">Shipping Address</h3>
            <div className="text-sm text-slate-600">
              {order.shippingAddress?.name}<br />
              {order.shippingAddress?.street}<br />
              {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}<br />
              {order.shippingAddress?.country}<br />
              {order.shippingAddress?.phone}
            </div>

            <h3 className="font-semibold text-sm text-slate-900">Payment</h3>
            <div className="text-sm text-slate-600">{(formatLabel(order.paymentMethod) || 'Cash on Delivery')} • <span className="capitalize font-medium">{order.paymentStatus || 'pending'}</span></div>

            {order.trackingNumber && (
              <>
                <h3 className="font-semibold text-sm text-slate-900 mt-3">Shipment</h3>
                <div className="text-sm text-slate-600">
                  <div className="font-medium">{order.carrier || '—'}</div>
                  <div className="text-sm">
                    <TrackingLink trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
                  </div>
                  {order.estimatedDelivery && <div className="text-xs text-slate-400 mt-0.5">ETA: {order.estimatedDelivery}</div>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base text-slate-900">Items Ordered</h3>
            {isEligibleForExchange && (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                14-Day Exchange Policy Active
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {Array.isArray(order.items) && order.items.map((it: any, idx: number) => {
              const exchange = it.exchange;
              const hasExchange = exchange && exchange.status && exchange.status !== 'none';

              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <img src={it.image || '/denfit-logo.jpg'} alt={it.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100" />
                    <div className="flex-1">
                      {(it.brand || (it.product && it.product.brand)) && (
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                          {it.brand || (it.product && it.product.brand)}
                        </div>
                      )}
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {(() => {
                          const colorObj = it.color && typeof it.color === 'object' ? it.color : null;
                          const colorName = it.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
                          const variantHex = it.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
                          const colorValue = typeof it.color === 'string' ? it.color : (variantHex || undefined);
                          const label = colorName || colorValue || '';
                          const displayLabel = getColorName(label);
                          return (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <span>{/ml$/i.test(String(it.size || '').trim()) ? 'Volume:' : 'Size:'} {it.size}</span>
                              {displayLabel ? (
                                <span className="inline-flex items-center gap-1">
                                  • Color: 
                                  {colorValue ? (
                                    <span className="w-3 h-3 rounded-full border inline-block" style={{ backgroundColor: String(colorValue) }} />
                                  ) : null}
                                  <span className="capitalize">{displayLabel}</span>
                                </span>
                              ) : null}
                              <span>• Qty: {it.quantity}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatCurrency((it.price || 0) * (it.quantity || 1))}</div>
                      {isEligibleForExchange && !hasExchange && (
                        <button
                          onClick={() => {
                            setExchangeModal({
                              open: true,
                              itemId: it._id,
                              itemName: it.name,
                              currentSize: it.size,
                              currentColor: it.color,
                            });
                            setDesiredSize('');
                            setDesiredColor('');
                            setCustomerNote('');
                          }}
                          className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Exchange
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer Exchange Status Banner */}
                  {hasExchange && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                          Exchange Request: <span className="uppercase font-bold">{exchange.status.replace('_', ' ')}</span>
                        </span>
                        <span className="text-[11px] text-indigo-600">
                          {exchange.requestedAt ? new Date(exchange.requestedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600 space-y-0.5">
                        {exchange.desiredSize && <div>Desired Size: <strong>{exchange.desiredSize}</strong></div>}
                        {exchange.desiredColor && <div>Desired Color: <strong>{exchange.desiredColor}</strong></div>}
                        {exchange.adminNote && <div>Staff Note: <em>"{exchange.adminNote}"</em></div>}
                        {exchange.storeCreditCode && (
                          <div className="mt-1 p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-medium">
                            Store Credit Voucher Issued: <code className="font-bold">{exchange.storeCreditCode}</code> for Rs {exchange.storeCreditIssued}. Use this code during your next checkout!
                          </div>
                        )}
                        {exchange.replacementTrackingNumber && (
                          <div className="mt-1 text-indigo-800 font-medium">
                            Replacement Tracking Number: {exchange.replacementTrackingNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-base text-slate-900 mb-4">Payment Summary</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal || 0)}</span></div>
            {order && (order.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Promo Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                <span>-{formatCurrency(order.discountAmount || 0)}</span>
              </div>
            )}
            {order && (order.storeCreditAmount || 0) > 0 && (
              <div className="flex justify-between text-purple-600 font-medium">
                <span>Store Credit Voucher {order.storeCreditCode ? `(${order.storeCreditCode})` : ''}</span>
                <span>-{formatCurrency(order.storeCreditAmount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{order.shippingCost === 0 ? 'FREE' : formatCurrency(order.shippingCost || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Amount</span>
              <span>{formatCurrency(order.customerTotal != null ? Number(order.customerTotal) : Number(order.total || 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item Exchange Request Modal */}
      {exchangeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Request Item Exchange</h3>
              </div>
              <button
                onClick={() => setExchangeModal({ open: false })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRequestExchange} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500">Item: </span>
                <strong className="text-slate-800">{exchangeModal.itemName}</strong>
                {exchangeModal.currentSize && <span className="ml-2 text-slate-500">• Size: {exchangeModal.currentSize}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Exchange
                </label>
                <select
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                  required
                >
                  <option value="Size too small">Size too small</option>
                  <option value="Size too large">Size too large</option>
                  <option value="Defective or damaged">Defective or damaged</option>
                  <option value="Received wrong item">Received wrong item</option>
                  <option value="Color different than expected">Color different than expected</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desired Size
                  </label>
                  <select
                    value={desiredSize}
                    onChange={(e) => setDesiredSize(e.target.value)}
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                  >
                    <option value="">Select size</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desired Color (Optional)
                  </label>
                  <input
                    type="text"
                    value={desiredColor}
                    onChange={(e) => setDesiredColor(e.target.value)}
                    placeholder="e.g. Olive Green"
                    className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  rows={3}
                  placeholder="Explain any specific preferences or fit concerns..."
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExchangeModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExchange}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingExchange ? 'Submitting...' : 'Submit Exchange Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
