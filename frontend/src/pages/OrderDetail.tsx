import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CreditCard, Clock } from 'lucide-react';
import { ordersAPI } from '../api';
import TrackingLink from '../components/TrackingLink';
import { formatCurrency } from '../utils/formatCurrency';
import { formatLabel } from '../utils/formatLabel';
import { getColorName } from '../utils/colorNames';

const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    if (!id) {
      setError('No order id provided');
      setLoading(false);
      return;
    }

    ordersAPI.getById(id)
      .then((res: any) => {
        if (!mounted) return;
        setOrder(res?.order || res?.data?.order || null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load order');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading order...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center">Order not found</div>;

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-sm text-gray-600">Order #{order.orderNumber || order._id}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-gray-500">Placed on</div>
              <div className="font-medium">{new Date(order.createdAt || order.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">{order.status}</div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Shipping Address</h3>
            <div className="text-sm text-gray-700">
              {order.shippingAddress?.name}<br />
              {order.shippingAddress?.street}<br />
              {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}<br />
              {order.shippingAddress?.country}<br />
              {order.shippingAddress?.phone}
            </div>

            <h3 className="font-semibold">Payment</h3>
            <div className="text-sm text-gray-700">{(formatLabel(order.paymentMethod) || 'N/A')} • {order.paymentStatus || 'pending'}</div>

            {order.trackingNumber && (
              <>
                <h3 className="font-semibold mt-3">Shipment</h3>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{order.carrier || '—'}</div>
                  <div className="text-sm">
                    <TrackingLink trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
                  </div>
                  {order.estimatedDelivery && <div className="text-xs text-gray-500">ETA: {order.estimatedDelivery}</div>}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-4">Items</h3>
          <div className="space-y-4">
            {Array.isArray(order.items) && order.items.map((it: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <img src={it.image} alt={it.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-500">
                    {(() => {
                      const colorObj = it.color && typeof it.color === 'object' ? it.color : null;
                      const colorName = it.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
                      const variantHex = it.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
                      const colorValue = typeof it.color === 'string' ? it.color : (variantHex || undefined);
                      const label = colorName || colorValue || '';
                      const displayLabel = getColorName(label);
                      return (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span>Size: {it.size}</span>
                          {displayLabel ? (
                            <span className="inline-flex items-center gap-1">
                              • Color: 
                              {colorValue ? (
                                <span className="w-3.5 h-3.5 rounded-full border inline-block" style={{ backgroundColor: String(colorValue) }} />
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
                <div className="font-semibold">{formatCurrency((it.price || 0) * (it.quantity || 1))}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal || 0)}</span></div>
            {order && (order.taxAmount || 0) > 0 && (
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(order.taxAmount || 0)}</span></div>
            )}
            <div className="flex justify-between"><span>Shipping</span><span>{order.shippingCost ? formatCurrency(order.shippingCost) : 'Free'}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total || 0)}</span></div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/shop" className="btn-primary">Continue Shopping</Link>
          <Link to="/orders" className="btn-secondary">Back to Orders</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
