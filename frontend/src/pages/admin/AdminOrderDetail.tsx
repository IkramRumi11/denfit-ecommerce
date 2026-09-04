// frontend/src/pages/admin/AdminOrderDetail.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../context/ToastContext";
import { api, API_BASE_URL } from "../../api";
import HistoryModal from "../../components/admin/HistoryModal";
import TrackingModal from "../../components/admin/TrackingModal";
import TrackingLink from '../../components/TrackingLink';
import { getColorName } from '../../utils/colorNames';
import {
  ArrowLeft,
  Clock,
  Truck,
  FileCheck,
  Printer,
  Download,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";

/**
 * World-class Admin Order Detail
 * - Feature rich: status confirm, tracking modal, history modal, print/download invoice, quick actions
 * - UX: animations, loading states, optimistic updates, accessible controls
 * - Theme: slate / blue / gray consistent with the rest of the admin UI
 *
 * Note: adapt API endpoints and response shapes to your backend.
 */

/* ---------- constants ---------- */
const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = typeof STATUS_OPTIONS[number];

type OrderType = {
  _id: string;
  orderNumber?: string;
  items?: Array<any>;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  status?: Status;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  shippingAddress?: any;
  createdAt?: string;
  updatedAt?: string;
  statusHistory?: any[];
  customerNote?: string;
  paymentStatus?: string;
  // extend as needed
};

/* ---------- small helpers ---------- */
const formatCurrency = (v?: number) =>
  v == null ? "—" : `Rs ${Math.round(v).toLocaleString()}`;

const formatDateLong = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
};

/* ---------- Confirm modal (inline small) ---------- */
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  busy?: boolean;
}> = ({ open, title, description, confirmLabel = "Confirm", onClose, onConfirm, busy }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
              }
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div initial={{ scale: 0.98, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 6 }} className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className="px-3 py-2 rounded-md border hover:bg-slate-50">Cancel</button>
              <button
                onClick={async () => {
                  await onConfirm();
                }}
                disabled={busy}
                className="px-3 py-2 rounded-md bg-slate-800 text-white disabled:opacity-60"
              >
                {busy ? "Working..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ---------- main component ---------- */
const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [order, setOrder] = useState<OrderType | null>(null);
  const [loading, setLoading] = useState(true);

  // UI states
  const [statusSaving, setStatusSaving] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openTrackingModal, setOpenTrackingModal] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; value?: Status; busy?: boolean }>({ open: false });
  const [quickActionBusy, setQuickActionBusy] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ---------- fetch order ---------- */
  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.admin.getOrderById(id);
      if (res?.data?.order) {
        setOrder(res.data.order);
        // tracking initial data is passed directly to TrackingModal from order
      } else {
        showToast("Unable to load order", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to load order", "error");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  /* ---------- status update flow with confirmation & optimistic UI ---------- */
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed','cancelled'],
    confirmed: ['processing','cancelled'],
    processing: ['shipped','cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };
  const requestStatusChange = async (newStatus: Status) => {
    // If status is destructive (cancel/delivered), show confirmation
    setConfirmStatus({ open: true, value: newStatus, busy: false });
  };

  const confirmAndApplyStatus = async () => {
    const desired = confirmStatus.value!;
    setConfirmStatus((s) => ({ ...s, busy: true }));
    setStatusSaving(true);
    try {
      // optimistic UI
      const prev = order;
      setOrder((o) => (o ? { ...o, status: desired } : o));

      const res = await api.admin.updateOrderStatus(id!, desired);
      if (res?.data?.order) {
        setOrder(res.data.order);
        showToast("Order status updated", "success");
      } else {
        // rollback
        setOrder(prev ?? null);
        showToast("Failed updating status", "error");
      }
    } catch (err: any) {
      console.error(err);
      // rollback on error
      if (order) {
        const prevStatus = (order as any).status;
        setOrder((o) => (o ? { ...o, status: prevStatus } : o));
      }
      showToast(err?.message || "Failed to update status", "error");
    } finally {
      setStatusSaving(false);
      setConfirmStatus({ open: false });
    }
  };

  /* ---------- tracking update (via small form or modal) ---------- */
  const handleTrackingSubmit = async (payload: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string; trackingUrl?: string }) => {
    // trackingSaving not used in UI; the modal has its own internal loading state
    try {
      const res = await api.admin.updateOrderTracking(id!, payload);
      if (res?.data?.order) {
        setOrder(res.data.order);
        showToast("Tracking updated", "success");
        setOpenTrackingModal(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to update tracking", "error");
    } finally {
      // trackingSaving not used in UI; the modal has its own internal loading state
    }
  };

  /* ---------- quick actions: print invoice, download invoice, refund placeholder ---------- */
  const handlePrintInvoice = async () => {
    if (!order) return;
    try {
      const url = `${API_BASE_URL}/admin/orders/${order._id}/invoice`;

      // Fetch the invoice endpoint first so we can detect JSON error responses
      // (which the server returns when required shipper/tracking info is missing).
      const resp = await fetch(url, { credentials: 'include' });

      const ct = resp.headers.get('content-type') || '';

      // If server returned JSON (error), show a toast with message instead of opening a new tab
      if (ct.includes('application/json') || !resp.ok) {
        let body: any = null;
        try { body = await resp.json(); } catch (e) { body = null; }
        const msg = (body && body.message) ? body.message : `Failed to prepare invoice (${resp.status})`;
        showToast(msg, 'error');
        return;
      }

      // If HTML returned, open it in a new tab safely (blob) so browser won't display raw JSON
      if (ct.includes('text/html') || ct.includes('application/xhtml+xml')) {
        const text = await resp.text();
        try {
          const blob = new Blob([text], { type: 'text/html' });
          const objUrl = URL.createObjectURL(blob);
          const w = window.open(objUrl, '_blank', 'noopener,noreferrer');
          if (!w) return showToast('Unable to open print window', 'error');
          try { w.focus(); } catch (e) {}
          // revoke after a short delay
          setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
          return;
        } catch (e) {
          console.error('Failed to open invoice HTML', e);
          showToast('Failed to open invoice', 'error');
          return;
        }
      }

      // Fallback: if content-type is unknown but ok, try to open directly
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) return showToast('Unable to open print window', 'error');
      try { w.focus(); } catch (e) {}
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to open print view', 'error');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      setDownloadingInvoice(true);
      // Download PDF from server endpoint (requires admin session/auth)
      const resp = await fetch(`${API_BASE_URL}/admin/orders/${order._id}/invoice/pdf`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to download invoice PDF');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.orderNumber || order._id}-invoice.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Invoice download started', 'success');
      setDownloadingInvoice(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to prepare invoice", "error");
      setDownloadingInvoice(false);
    }
  };

  const handleQuickRefund = async () => {
    if (!order) return;
    setQuickActionBusy(true);
    try {
      const refundAmount = order.total || 0;
      const res = await api.admin.refundOrder(id!, refundAmount, 'Refund processed by admin');
      if (res?.data?.order) {
        setOrder(res.data.order);
        showToast("Refund processed", "success");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Refund failed", "error");
    } finally {
      setQuickActionBusy(false);
    }
  };

  /* ---------- helpers ---------- */
  const subtotal = order?.subtotal ?? 0;
  const discountAmount = order?.discountAmount ?? 0;
  const promoCode = order?.promoCode;
  const shippingCost = order?.shippingCost ?? 0;
  // Admin UI should display tax-excluded totals only
  const displayedTotal = (typeof order?.total === 'number' && !Number.isNaN(Number(order.total))) ? Number(order.total) : Math.round(((subtotal - discountAmount) + shippingCost) * 100) / 100;

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-slate-700">Order not found — <Link to="/admin/orders" className="text-blue-600 underline">back to orders</Link></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-md hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="text-xs text-slate-500">Order</div>
            <div className="text-2xl font-bold">{order.orderNumber || order._id}</div>
            <div className="text-xs text-slate-500">Placed {formatDateLong(order.createdAt)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setOpenHistory(true)} className="px-3 py-2 rounded-md border hover:bg-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4" /> History
          </button>

            <div className="flex items-center gap-2 rounded-md overflow-hidden border">
            <button onClick={handlePrintInvoice} title="Print invoice" className="px-3 py-2 hover:bg-slate-50">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={handleDownloadInvoice} title="Download invoice" disabled={downloadingInvoice} aria-busy={downloadingInvoice} className={`px-3 py-2 hover:bg-slate-50 ${downloadingInvoice ? 'opacity-70 cursor-wait' : ''}`}>
              <div className="relative w-5 h-5 flex items-center justify-center">
                {downloadingInvoice && (
                  <span className="absolute inline-flex w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                )}
                <Download className="w-4 h-4" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setOpenTrackingModal(true)} className="px-3 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Add Tracking
            </button>
          </div>
        </div>
      </div>

      {/* main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left content */}
        <div className="lg:col-span-2 space-y-6">
          {/* items card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">Items</h3>
            <div className="space-y-4">
              {order.items?.map((it: any) => (
                <div key={it._id || it.product} className="flex items-center gap-4">
                  <img src={it.image || "/placeholder.png"} alt={it.name} className="w-16 h-16 rounded-lg object-cover border" />
                      <div className="flex-1">
                        <div className="font-semibold">{it.name}</div>
                        <div className="text-sm text-slate-500">
                          Qty {it.quantity} • {it.size ?? "—"}
                          {(() => {
                            const variantLabel = it.variantName || it.colorName || '';
                            const colorObj = it.color && typeof it.color === 'object' ? it.color : null;
                            const colorHex = it.variantHex || (colorObj ? (colorObj.hex || '') : (typeof it.color === 'string' ? it.color : ''));
                            const label = variantLabel || (colorObj ? (colorObj.name || '') : (typeof it.color === 'string' ? it.color : ''));
                            if (!label) return null;
                            const displayLabel = getColorName(label);
                            return (
                              <span className="ml-1">
                                • Color: {colorHex ? (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: String(colorHex) }} />
                                    <span className="font-medium text-slate-700 capitalize">{displayLabel}</span>
                                  </span>
                                ) : (
                                  <span className="font-medium text-slate-700 capitalize">{displayLabel}</span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                    <div className="text-xs text-slate-400 mt-1">{it.sku ? `SKU: ${it.sku}` : null}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(it.price)}</div>
                    <div className="text-sm text-slate-500">Subtotal: {formatCurrency((it.price ?? 0) * (it.quantity ?? 1))}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* shipping & note */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-500">Shipping to</div>
                <div className="font-medium">{order.shippingAddress?.name}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                </div>
                <div className="text-sm text-slate-600 mt-1">{order.shippingAddress?.country}</div>
                <div className="text-sm text-slate-600 mt-1">Phone: {order.shippingAddress?.phone}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-500">Customer note</div>
                <div className="text-sm text-slate-700 mt-2">{order.customerNote || "—"}</div>
              </div>
            </div>
          </div>

          {/* timeline + activity / order meta */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Order Timeline</h3>
              <div className="text-sm text-slate-500">Last updated {formatDateLong(order.updatedAt)}</div>
            </div>

            <div className="mt-4">
              {/* compact timeline preview */}
              <div className="space-y-3">
                {(order.statusHistory || []).slice(-4).reverse().map((h: any, idx: number) => (
                  <div key={h._id || `${h.to}-${idx}`} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{h.to}</div>
                        <div className="text-xs text-slate-400">{formatDateLong(h.at)}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{h.note || ""}</div>
                    </div>
                  </div>
                ))}
              </div>

              { (order.statusHistory || []).length > 0 && (
                <div className="mt-4 text-right">
                  <button onClick={() => setOpenHistory(true)} className="text-sm px-3 py-1 rounded border hover:bg-slate-50">View full timeline</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right column */}
        <aside className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h4 className="text-sm text-slate-500">Summary</h4>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-sm text-slate-600"><div>Subtotal</div><div>{formatCurrency(subtotal)}</div></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 font-medium">
                  <div>Promo Discount {promoCode ? `(${promoCode})` : ''}</div>
                  <div>-{formatCurrency(discountAmount)}</div>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600"><div>Shipping</div><div>{formatCurrency(shippingCost)}</div></div>
              <div className="flex justify-between text-lg font-semibold"><div>Total</div><div>{formatCurrency(displayedTotal)}</div></div>
            </div>

            {/* Status select with confirm flow */}
            <div className="mt-4">
              <label htmlFor="orderStatus" className="block text-sm text-slate-600">Status</label>
              <div className="mt-2 flex gap-2">
                <select
                  id="orderStatus"
                  value={order.status}
                  onChange={(e) => requestStatusChange(e.target.value as Status)}
                  className="flex-1 p-2 border rounded"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option
                      key={s}
                      value={s}
                      disabled={!(s === order.status || ALLOWED_TRANSITIONS[order.status || 'pending']?.includes(s))}
                    >
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col gap-2">
                  <button onClick={() => loadOrder()} title="Refresh" className="p-2 rounded-md border hover:bg-slate-50"><RefreshCw className="w-4 h-4" /></button>
                </div>
              </div>
              {statusSaving && <div className="text-xs text-slate-500 mt-2">Saving status...</div>}
            </div>

            {/* tracking summary */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600">Shipment</div>
                  <div className="font-semibold">{order.carrier || "—"}</div>
                  <div className="text-xs text-slate-500">{
                    order.trackingNumber ? (
                      <TrackingLink trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
                    ) : (
                      "No tracking"
                    )
                  }</div>
                  <div className="text-xs text-slate-400 mt-1">{order.estimatedDelivery ? `ETA: ${order.estimatedDelivery}` : ""}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setOpenTrackingModal(true)} className="px-3 py-1 rounded bg-slate-800 text-white text-sm">Edit</button>
                  <button onClick={() => { navigator.clipboard?.writeText(order.trackingNumber || ""); showToast("Copied tracking to clipboard", "success"); }} className="px-3 py-1 rounded border text-sm">Copy</button>
                </div>
              </div>
            </div>

            {/* quick actions */}
            <div className="mt-6 border-t pt-4 flex flex-col gap-3">
              <button onClick={handleQuickRefund} disabled={quickActionBusy} className="w-full px-3 py-2 rounded bg-rose-600 text-white disabled:opacity-70 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Refund
              </button>
              <button onClick={() => { showToast("Placeholder: generate shipping label", "info"); }} className="w-full px-3 py-2 rounded border flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Create shipment
              </button>
            </div>
          </div>

          {/* meta / actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="text-sm text-slate-600">Order meta</div>
            <div className="mt-2 text-sm text-slate-700 space-y-1">
              <div>Placed: {formatDateLong(order.createdAt)}</div>
              <div>Updated: {formatDateLong(order.updatedAt)}</div>
              <div>Payment: {order.paymentStatus || "—"}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => showToast("Open customer profile (placeholder)", "info")} className="px-3 py-2 rounded border text-sm">Customer</button>
              <button onClick={() => showToast("Open product list (placeholder)", "info")} className="px-3 py-2 rounded border text-sm">Products</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {openHistory && <HistoryModal order={order} onClose={() => setOpenHistory(false)} />}
      {openTrackingModal && (
        <TrackingModal
          order={order}
          onClose={() => setOpenTrackingModal(false)}
          onSubmit={async (track) => {
            await handleTrackingSubmit(track);
          }}
        />
      )}

      <ConfirmModal
        open={confirmStatus.open}
        title={`Change status to "${confirmStatus.value}"?`}
        description={confirmStatus.value === "cancelled" ? "Cancelling an order will initiate cancellation flow. This action may refund the customer depending on your policy." : undefined}
        confirmLabel="Change status"
        onClose={() => setConfirmStatus({ open: false })}
        onConfirm={async () => { await confirmAndApplyStatus(); }}
        busy={confirmStatus.busy}
      />
    </div>
  );
};

/* ---------- small helper to render basic invoice HTML (client side) ---------- */
function renderInvoiceHTML(order: OrderType) {
  const itemsHtml = (order.items || []).map((it: any) => {
    const colorObj = it.color && typeof it.color === 'object' ? it.color : null;
    const colorName = it.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
    const variantName = it.variantName || undefined;
    const variantHex = it.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
    const colorValue = typeof it.color === 'string' ? it.color : (variantHex || undefined);
    const label = variantName || colorName || colorValue || '';
    const displayLabel = getColorName(label);
    const swatchHex = colorValue || (label && label.startsWith('#') ? label : undefined);
    
    let metaHtml = '';
    if (it.size || displayLabel) {
      metaHtml += '<div style="font-size:11px;color:#666;display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px;">';
      if (it.size) {
        metaHtml += `<span>Size: ${it.size}</span>`;
      }
      if (it.size && displayLabel) {
        metaHtml += '<span>•</span>';
      }
      if (displayLabel) {
        metaHtml += '<span style="display:inline-flex;align-items:center;gap:4px;">';
        metaHtml += 'Color: ';
        if (swatchHex) {
          metaHtml += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${swatchHex};border:1px solid #ddd;vertical-align:middle;margin:0 2px;"></span>`;
        }
        metaHtml += `<span style="text-transform:capitalize;vertical-align:middle;">${displayLabel}</span>`;
        metaHtml += '</span>';
      }
      metaHtml += '</div>';
    }

    let itemImg = it.image;
    if (!itemImg && it.product && it.product.images && it.product.images.length > 0) {
      const pri = it.product.images.find((img: any) => img.isPrimary);
      itemImg = pri ? pri.url : it.product.images[0].url;
    }
    if (!itemImg) {
      itemImg = 'https://i.ibb.co/GQG243Rb/DENFiT.jpg';
    }

    return `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${itemImg}" alt="Product thumbnail" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #eee;flex-shrink:0;">
          <div>
            <strong style="display:block;font-size:13px;margin-bottom:2px;">${it.name}</strong>
            ${metaHtml}
          </div>
        </div>
      </td>
      <td style="padding:8px;border:1px solid #ddd">${it.sku || (it.product && it.product.sku) || ''}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs ${Number(it.price).toFixed(2)}</td>
    </tr>
  `}).join("");
  // Compute subtotal, discount, and shipping; do NOT include tax in customer-facing invoice
  const subtotal = typeof order.subtotal === 'number' ? Number(order.subtotal) : (order.items || []).reduce((s:any,it:any)=>s + ((Number(it.price)||0)*(Number(it.quantity)||0)), 0);
  const discount = typeof (order as any).discountAmount === 'number' ? Number((order as any).discountAmount) : 0;
  const promoCode = (order as any).promoCode;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping = typeof order.shippingCost === 'number' ? Number(order.shippingCost) : (discountedSubtotal < 5000 ? 300 : 0);
  // Do not include tax in invoice preview; compute totals without tax
  const total = typeof order.total === 'number' ? Number(order.total) : Math.round((discountedSubtotal + shipping) * 100) / 100;

  return `
    <html>
      <head><meta charset="utf-8"><title>Invoice ${order.orderNumber || order._id}</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <img src="https://i.ibb.co/GQG243Rb/DENFiT.jpg" alt="DENFiT logo" style="max-height:48px;width:auto;border-radius:8px;">
          <span style="font-size:26px;font-weight:800;color:#111827;letter-spacing:0.05em;text-transform:uppercase;">DENFiT</span>
        </div>
        <hr style="border:0;border-top:1px solid #eee;margin-bottom:18px;">
        <h2>Invoice - ${order.orderNumber || order._id}</h2>
        <div>Placed: ${formatDateLong(order.createdAt)}</div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
            <thead>
              <tr><th style="text-align:left;padding:8px;border:1px solid #ddd">Product</th><th style="text-align:left;padding:8px;border:1px solid #ddd">SKU</th><th style="padding:8px;border:1px solid #ddd">Qty</th><th style="padding:8px;border:1px solid #ddd">Price</th></tr>
            </thead>
          <tbody>
            ${itemsHtml}
            <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Subtotal</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Rs ${Number(subtotal).toFixed(2)}</strong></td></tr>
            ${discount > 0 ? `<tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a"><strong>Promo Discount ${promoCode ? `(${promoCode})` : ''}</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a"><strong>-Rs ${Number(discount).toFixed(2)}</strong></td></tr>` : ''}
            <!-- GST row intentionally omitted -->
            <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right">Shipping</td><td style="padding:8px;border:1px solid #ddd;text-align:right">Rs ${Number(shipping).toFixed(2)}</td></tr>
            <tr><td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Total</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Rs ${Number(total).toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export default AdminOrderDetail;
