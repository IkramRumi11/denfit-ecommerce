import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api';
import TrackingModal from '../../components/admin/TrackingModal';
import AdminNoteModal from '../../components/admin/AdminNoteModal';
import HistoryModal from '../../components/admin/HistoryModal';

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

  useEffect(() => { fetchOrders(page, limit); }, [fetchOrders, page, limit]);

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

  const submitTracking = async (orderId: string, payload: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string }) => {
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
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className="border-t">
                  <td className="p-3">{o.orderNumber || o._id}</td>
                  <td className="p-3">{o.customer?.name} <div className="text-xs text-gray-500">{o.customer?.email}</div></td>
                  <td className="p-3">${(o.total || 0).toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{o.status}</div>
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        onChange={(e) => { const v = e.target.value; if (v) setPendingChange({ order: o, to: v }); }}
                        value=""
                      >
                        <option value="">Quick change</option>
                        {allowedTransitions[o.status || 'pending']?.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-gray-400">{o.confirmedAt ? `Confirmed: ${new Date(o.confirmedAt).toLocaleString()}` : ''}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openTracking(o)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Tracking</button>
                      <button onClick={() => setViewingHistoryOrder(o)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">History</button>
                      <button onClick={() => window.location.href = `/admin/orders/${o._id}`} className="px-3 py-1 bg-gray-100 rounded text-sm">Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          onSubmit={submitTracking}
        />
      )}
      {pendingChange && (
        <AdminNoteModal
          order={pendingChange.order}
          to={pendingChange.to}
          onClose={() => setPendingChange(null)}
          onConfirm={(note?: string) => confirmChangeWithNote(note)}
        />
      )}
      {viewingHistoryOrder && (
        <HistoryModal order={viewingHistoryOrder} onClose={() => setViewingHistoryOrder(null)} />
      )}
    </div>
  );
};

export default AdminOrders;
