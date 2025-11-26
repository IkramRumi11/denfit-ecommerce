// frontend/src/pages/admin/AdminOrderDetail.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import HistoryModal from "../../components/admin/HistoryModal";
import TrackingModal from "../../components/admin/TrackingModal";
import {
  ArrowLeft,
  Clock,
  Truck,
  FileCheck,
  Printer,
  Download,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Zap,
  AlertTriangle,
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
  return new Date(iso).toLocaleString();
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
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState({ trackingNumber: "", carrier: "", estimatedDelivery: "" });
  const [openHistory, setOpenHistory] = useState(false);
  const [openTrackingModal, setOpenTrackingModal] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; value?: Status; busy?: boolean }>({ open: false });
  const [quickActionBusy, setQuickActionBusy] = useState(false);

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
        setTrackingDraft({
          trackingNumber: res.data.order.trackingNumber || "",
          carrier: res.data.order.carrier || "",
          estimatedDelivery: res.data.order.estimatedDelivery ? res.data.order.estimatedDelivery.slice(0,10) : "",
        });
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
  const handleTrackingSubmit = async (payload: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string }) => {
    setTrackingSaving(true);
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
      setTrackingSaving(false);
    }
  };

  /* ---------- quick actions: print invoice, download invoice, refund placeholder ---------- */
  const handlePrintInvoice = () => {
    if (!order) return;
    const html = renderInvoiceHTML(order);
    try {
      // Safer approach: create a blob URL and open it in a new window/tab.
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) return showToast("Unable to open print window", "error");
      // Give the new window a moment to load the blob content, then trigger print.
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch (e) {
          console.error('Print failed:', e);
          showToast('Unable to print invoice', 'error');
        }
      }, 400);
      // Revoke the object URL after some time to free memory
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error(err);
      showToast('Failed to open print view', 'error');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      // For now generate a simple HTML then download as .html (you can wire server PDF generation)
      const html = renderInvoiceHTML(order);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.orderNumber || order._id}-invoice.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Invoice prepared for download", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to prepare invoice", "error");
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
  const shippingCost = order?.shippingCost ?? 0;
  const total = order?.total ?? subtotal + shippingCost;

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
            <button onClick={handleDownloadInvoice} title="Download invoice" className="px-3 py-2 hover:bg-slate-50">
              <Download className="w-4 h-4" />
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
                    <div className="text-sm text-slate-500">Qty {it.quantity} • {it.size ?? "—"}</div>
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
              <div className="flex justify-between text-sm text-slate-600"><div>Shipping</div><div>{formatCurrency(shippingCost)}</div></div>
              <div className="flex justify-between text-lg font-semibold"><div>Total</div><div>{formatCurrency(total)}</div></div>
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
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  <div className="text-xs text-slate-500">{order.trackingNumber || "No tracking"}</div>
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
      <HistoryModal order={order} onClose={() => setOpenHistory(false)} />
      <TrackingModal
        order={order}
        onClose={() => setOpenTrackingModal(false)}
        onSubmit={async (track) => {
          await handleTrackingSubmit(track);
        }}
      />

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
  const itemsHtml = (order.items || []).map((it: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${it.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">Rs ${Math.round(it.price).toLocaleString()}</td>
    </tr>
  `).join("");
  return `
    <html>
      <head><meta charset="utf-8"><title>Invoice ${order.orderNumber || order._id}</title></head>
      <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
        <h2>Invoice - ${order.orderNumber || order._id}</h2>
        <div>Placed: ${formatDateLong(order.createdAt)}</div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr><th style="text-align:left;padding:8px;border:1px solid #ddd">Product</th><th style="padding:8px;border:1px solid #ddd">Qty</th><th style="padding:8px;border:1px solid #ddd">Price</th></tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr><td colspan="2" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Subtotal</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>${formatCurrency(order.subtotal)}</strong></td></tr>
            <tr><td colspan="2" style="padding:8px;border:1px solid #ddd;text-align:right">Shipping</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(order.shippingCost)}</td></tr>
            <tr><td colspan="2" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Total</strong></td><td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>${formatCurrency(order.total)}</strong></td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export default AdminOrderDetail;
