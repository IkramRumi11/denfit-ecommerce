import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { ordersAPI } from '../api';
import { getColorName } from '../utils/colorNames';
import TrackingLink from '../components/TrackingLink';
import { useAuth } from '../context/AuthContext';

const Orders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    ordersAPI.getAll()
      .then((res: any) => {
        if (!mounted) return;
        setOrders(Array.isArray(res?.orders) ? res.orders : []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load orders');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to view your orders</h2>
          <Link to="/auth" className="btn-primary">Login / Signup</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-sm text-gray-600">Review your recent purchases and order details</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">You haven't placed any orders yet</h3>
              <p className="text-gray-600 mb-4">When you place an order, it will appear here.</p>
              <Link to="/shop" className="btn-primary">Start Shopping</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o: any) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const first = items.length ? items[0] : null;
                const firstImage = first?.image || (first?.images && first.images[0]) || first?.thumbnail || '';
                const names = items.map((it: any) => it?.name || it?.title || it?.productName || '').filter(Boolean);
                const visibleNames = names.slice(0, 2);
                const remaining = Math.max(0, names.length - visibleNames.length);
                const orderKey = o._id || o.id;
                const orderIdDisplay = o.orderNumber || orderKey;

                return (
                  <div key={orderKey} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4 min-w-0">
                      <Link to={`/orders/${orderKey}`} className="w-12 h-12 bg-blue-50 rounded-lg overflow-hidden flex-shrink-0">
                        {firstImage ? (
                          <img src={firstImage} alt={names[0] || 'Product image'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{orderIdDisplay}</div>
                        <div className="text-sm text-gray-600">{new Date(o.createdAt || o.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</div>

                        <div className="text-sm text-gray-900 mt-1">
                          {names.length > 0 && (
                            <>
                              <div className="block sm:hidden truncate text-sm font-medium text-gray-900">{names[0]}</div>

                              <div className="hidden sm:block truncate text-sm font-medium text-gray-900">
                                {(() => {
                                  const joined = visibleNames.join(', ');
                                  if (remaining > 0) {
                                    return (
                                      <>
                                        <span className="truncate inline-block align-middle">{joined}</span>
                                        <span className="text-gray-500 mx-1">...</span>
                                        <Link to={`/orders/${orderKey}`} className="text-blue-600 hover:underline inline-block">+{remaining}</Link>
                                      </>
                                    );
                                  }
                                  return <span className="truncate">{joined}</span>;
                                })()}
                              </div>
                            </>
                          )}

                          {(() => {
                            const firstItem = first;
                            if (!firstItem) return null;
                            const colorObj = firstItem.color && typeof firstItem.color === 'object' ? firstItem.color : null;
                            const colorName = firstItem.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
                            const variantName = firstItem.variantName || undefined;
                            const variantHex = firstItem.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
                            const colorValue = typeof firstItem.color === 'string' ? firstItem.color : (variantHex || undefined);
                            let label = variantName || colorName || '';
                            if (!label && typeof firstItem.color === 'string') label = getColorName(firstItem.color);
                            const displayLabel = getColorName(label);
                            return (
                              <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                                {firstItem.size ? <span>Size: {firstItem.size}</span> : null}
                                {firstItem.size && displayLabel ? <span>•</span> : null}
                                {displayLabel ? (
                                  <span className="inline-flex items-center gap-1">
                                    Color: 
                                    {colorValue ? (
                                      <span className="w-3 h-3 rounded-full border inline-block" style={{ backgroundColor: String(colorValue) }} />
                                    ) : null}
                                    <span className="capitalize">{displayLabel}</span>
                                  </span>
                                ) : null}
                                {!firstItem.size && !displayLabel && o.trackingNumber ? (
                                  <TrackingLink trackingNumber={o.trackingNumber} trackingUrl={o.trackingUrl} />
                                ) : null}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold mt-1">
                        Rs {Number(o.customerTotal != null ? o.customerTotal : (Number(o.discountAmount || 0) > 0 ? Math.max(0, Number(o.subtotal || 0) - Number(o.discountAmount || 0)) + Number(o.shippingCost || 0) : (o.total || o.totalAmount || 0))).toLocaleString()}
                      </div>
                      <Link to={`/orders/${orderKey}`} className="text-blue-600 text-sm mt-2 inline-block">View</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
