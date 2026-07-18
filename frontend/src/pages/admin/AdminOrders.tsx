import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api';
import TrackingModal from '../../components/admin/TrackingModal';
import AdminNoteModal from '../../components/admin/AdminNoteModal';
import HistoryModal from '../../components/admin/HistoryModal';
import { getColorName } from '../../utils/colorNames';

const PAGE_SIZE = 10;

const allowedTransitions: Record<string, string[]> = {
  pending: ['confirmed','cancelled'],
  confirmed: ['processing','cancelled'],
  processing: ['shipped','cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = PAGE_SIZE;
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any | null>(null);
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  const fetchOrders = React.useCallback(async (p = 1, l = limit) => {
    setLoading(true);
    try {
      const params: any = {
        page: p,
        limit: l,
      };
      if (filterStatus) params.status = filterStatus;
      if (searchText) params.search = searchText;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.admin.getAllOrders(params);
      if (res?.data) {
        setOrders(res.data.orders || []);
        setPage(res.data.pagination?.current || p);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load orders', 'error');
    } finally { setLoading(false); }
  }, [filterStatus, searchText, startDate, endDate, limit, showToast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(page, limit); }, [page, limit]);

  const applyFilters = () => { setPage(1); fetchOrders(1, limit); };

  const jumpToPage = () => {
    const p = Math.max(1, Math.min(totalPages, Number(jumpPageInput) || 1));
    setPage(p);
    fetchOrders(p, limit);
  };

  

  // New flow: open admin-note modal before applying status change
  const [pendingChange, setPendingChange] = useState<{ order: any; to: string } | null>(null);
  const [lastChange, setLastChange] = useState<null | { orderId: string; prevStatus: string; newStatus: string }>(null);

  const confirmChangeWithNote = async (note?: string) => {
    if (!pendingChange) return;
    const { order, to } = pendingChange;
    try {
      const res = await api.admin.updateOrderStatus(order._id, to, note);
      if (res?.data?.order) {
        const updated = res.data.order;
        setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
        showToast('Order status updated', 'success');
        // set undo state for short period
        setLastChange({ orderId: updated._id, prevStatus: pendingChange!.order.status, newStatus: updated.status });
        setTimeout(() => setLastChange(null), 10000); // clear after 10s
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to update status', 'error');
    } finally {
      setPendingChange(null);
    }
  };

  const undoLastChange = async () => {
    if (!lastChange) return;
    try {
      const res = await api.admin.updateOrderStatus(lastChange.orderId, lastChange.prevStatus, 'Undo recent change');
      if (res?.data?.order) {
        const updated = res.data.order;
        setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
        showToast('Change undone', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to undo change', 'error');
    } finally {
      setLastChange(null);
    }
  };

  const openTracking = (order: any) => setSelectedOrderForTracking(order);
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState<any | null>(null);

  const submitTracking = async (orderId: string, payload: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string; trackingUrl?: string }) => {
    try {
      const res = await api.admin.updateOrderTracking(orderId, payload);
      if (res?.data?.order) {
        const updated = res.data.order;
        setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
        showToast('Tracking updated and order marked shipped', 'success');
        setSelectedOrderForTracking(null);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to update tracking', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
      </div>
      {lastChange && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
          <div className="text-sm">Status changed from <strong>{lastChange.prevStatus}</strong> to <strong>{lastChange.newStatus}</strong>.</div>
          <div className="flex gap-2">
            <button onClick={() => undoLastChange()} className="px-3 py-1 bg-white border rounded">Undo</button>
          </div>
        </div>
      )}

      <div className="mb-4 bg-white p-3 rounded shadow-sm flex gap-3 items-end flex-wrap">
        <div>
          <label htmlFor="filterStatus" className="block text-xs text-gray-600">Status</label>
          <select id="filterStatus" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Any</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="filterSearch" className="block text-xs text-gray-600">Search (order# or item)</label>
          <input id="filterSearch" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search" className="border rounded px-2 py-1" />
        </div>

        <div>
          <label htmlFor="filterStart" className="block text-xs text-gray-600">Start date</label>
          <input id="filterStart" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>

        <div>
          <label htmlFor="filterEnd" className="block text-xs text-gray-600">End date</label>
          <input id="filterEnd" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => applyFilters()} className="px-3 py-1 bg-gray-800 text-white rounded">Apply</button>
          <button onClick={() => { setFilterStatus(''); setSearchText(''); setStartDate(''); setEndDate(''); applyFilters(); }} className="px-3 py-1 border rounded">Reset</button>
        </div>

        <div className="ml-auto flex items-end gap-2">
          <input value={jumpPageInput} onChange={e => setJumpPageInput(e.target.value)} placeholder="Jump to" className="w-20 border rounded px-2 py-1" />
          <button onClick={() => jumpToPage()} className="px-3 py-1 border rounded">Go</button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center items-center"><LoadingSpinner size="xl" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px] border-collapse">
              <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                <tr>
                  <th className="p-3">Order # / Placed</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Products</th>
                  <th className="p-3">Summary</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Workflow / Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id} className="border-t hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-bold text-gray-900">{o.orderNumber || o._id}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Placed: {o.createdAt ? new Date(o.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) : (o.date ? new Date(o.date).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) : '')}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium text-gray-900">{o.shippingAddress?.name || o.customer?.name || 'Guest'}</div>
                      <div className="text-xs text-gray-600">{o.contactEmail || o.shippingAddress?.email || o.guestEmail || o.customer?.email || '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">Phone: {o.shippingAddress?.phone || '—'}</div>
                      {o.customer && o.customer.name && (o.shippingAddress?.name !== o.customer.name) && (
                        <div className="text-[10px] text-slate-400 mt-1">Account: {o.customer.name}</div>
                      )}
                    </td>

                    <td className="p-3 align-top min-w-[280px]">
                      <div className="space-y-2">
                        {(o.items || []).map((item: any, idx: number) => {
                          const colorObj = item.color && typeof item.color === 'object' ? item.color : null;
                          const colorName = item.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
                          const variantHex = item.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
                          const colorValue = typeof item.color === 'string' ? item.color : (variantHex || undefined);
                          const label = colorName || colorValue || '';
                          const displayLabel = getColorName(label);

                          return (
                            <div key={item._id || idx} className="flex items-center gap-2">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded border border-gray-200"
                                  onError={(e: any) => { e.target.onerror = null; e.target.src = '/denfit-logo.jpg'; }}
                                />
                              )}
                              <div className="text-xs leading-tight">
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-gray-500 flex flex-wrap items-center gap-1 mt-0.5">
                                  <span>Qty: {item.quantity}</span>
                                  {item.size ? <span>• Size: {item.size}</span> : null}
                                  {displayLabel ? (
                                    <span className="inline-flex items-center gap-1">
                                      • Color: 
                                      {colorValue ? (
                                        <span className="w-2.5 h-2.5 rounded-full border inline-block" style={{ backgroundColor: String(colorValue) }} />
                                      ) : null}
                                      <span className="capitalize">{displayLabel}</span>
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="text-xs space-y-0.5 text-gray-600">
                        <div>Subtotal: Rs {Number(o.subtotal || 0).toFixed(2)}</div>
                        <div>Shipping: Rs {Number(o.shippingCost || 0).toFixed(2)}</div>
                        {typeof o.taxAmount === 'number' && o.taxAmount > 0 && (
                          <div>Tax: Rs {o.taxAmount.toFixed(2)}</div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-blue-600 mt-1">Rs {Number(o.total || 0).toFixed(2)}</div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          o.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                          o.status === 'confirmed' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          o.status === 'processing' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                          o.status === 'shipped' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          o.status === 'delivered' ? 'bg-green-50 text-green-800 border-green-200' :
                          'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {o.status}
                        </span>
                        <select
                          className="border rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 cursor-pointer"
                          onChange={(e) => { const v = e.target.value; if (v) setPendingChange({ order: o, to: v }); }}
                          value=""
                        >
                          <option value="">Quick change</option>
                          {allowedTransitions[o.status || 'pending']?.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {(() => {
                          const candidates = [o.cancelledAt, o.deliveredAt, o.shippedAt, o.processingAt, o.confirmedAt, o.updatedAt, o.createdAt, o.date]
                            .filter(Boolean)
                            .map((t: any) => new Date(t).getTime())
                            .filter(Boolean);
                          if (!candidates.length) return '';
                          const max = Math.max(...candidates);
                          return `Updated: ${new Date(max).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`;
                        })()}
                      </div>
                      {o.statusHistory && o.statusHistory.length > 0 && (
                        <div className="text-[9px] text-gray-400 mt-0.5 italic">
                          {(() => {
                            const last = o.statusHistory[o.statusHistory.length - 1];
                            return `By ${last.byName || 'System'} at ${new Date(last.at).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`;
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1.5 w-max">
                        {/* Dispatch / Processing Workflow Button */}
                        {o.status === 'pending' && (
                          <button
                            onClick={() => setPendingChange({ order: o, to: 'confirmed' })}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition"
                          >
                            Confirm Order
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button
                            onClick={() => setPendingChange({ order: o, to: 'processing' })}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                          >
                            Process Order
                          </button>
                        )}
                        {o.status === 'processing' && (
                          <button
                            onClick={() => openTracking(o)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold transition"
                          >
                            Ship Order
                          </button>
                        )}
                        {o.status === 'shipped' && (
                          <button
                            onClick={() => setPendingChange({ order: o, to: 'delivered' })}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition"
                          >
                            Deliver Order
                          </button>
                        )}

                        {/* Details / History Actions */}
                        <div className="flex gap-1.5 mt-1 border-t pt-1.5">
                          <button
                            onClick={() => setViewingHistoryOrder(o)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
                          >
                            History
                          </button>
                          <button
                            onClick={() => window.location.href = `/admin/orders/${o._id}`}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <button className="px-3 py-1 border rounded mr-2" disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchOrders(p); }}>Previous</button>
          <button className="px-3 py-1 border rounded" disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchOrders(p); }}>Next</button>
        </div>
        <div className="text-sm text-gray-600">Showing {orders.length} orders</div>
      </div>

      {selectedOrderForTracking && (
        <TrackingModal
          order={selectedOrderForTracking}
          onClose={() => setSelectedOrderForTracking(null)}
          onSubmit={(payload) => submitTracking(selectedOrderForTracking!._id, payload)}
        />
      )}
      {pendingChange && (
        <AdminNoteModal
          order={pendingChange.order}
          to={pendingChange.to}
          onClose={() => setPendingChange(null)}
          onConfirm={(note?: string) => confirmChangeWithNote(note)}
          isOpen={true}
        />
      )}
      {viewingHistoryOrder && (
        <HistoryModal order={viewingHistoryOrder} onClose={() => setViewingHistoryOrder(null)} />
      )}
    </div>
  );
};

export default AdminOrders;
