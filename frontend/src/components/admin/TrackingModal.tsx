// frontend/src/components/admin/TrackingModal.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck, Hash, CalendarDays, CheckCircle2 } from "lucide-react";

interface Props {
  order: { _id: string; orderNumber?: string; trackingNumber?: string; carrier?: string; estimatedDelivery?: string; trackingUrl?: string };
  onClose: () => void;
  // Simplified: the modal will call onSubmit with the payload only. Parent can use the `order` prop to resolve the id.
  onSubmit: (payload: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string; trackingUrl?: string }) => Promise<void>;
}

const TrackingModal: React.FC<Props> = ({ order, onClose, onSubmit }) => {
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || "");
  const [carrier, setCarrier] = useState(order?.carrier || "");
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    order?.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().slice(0, 10) : ""
  );
  const [trackingUrl, setTrackingUrl] = useState(order?.trackingUrl || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);

  // Scroll lock & focus setup
  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => firstFocusRef.current?.focus(), 150);
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape and focus trap
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Outside click
  const handleWrapperClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    },
    [modalRef, onClose]
  );

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        trackingUrl: trackingUrl?.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => handleClose(), 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onMouseDown={handleWrapperClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-auto"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", damping: 22 } }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Add / Update Tracking</h2>
                <p className="text-sm text-slate-200/80">
                  Order <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{order.orderNumber || order._id}</span>
                </p>
              </div>
            </div>
            <button
              ref={firstFocusRef}
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-md"
              aria-label="Close tracking modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-700 custom-scrollbar">
            <div>
              <label htmlFor="trackingCarrier" className="block text-xs text-slate-600 mb-1 font-medium">Carrier</label>
              <div className="relative">
                <Truck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="trackingCarrier"
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                  placeholder="e.g. DHL, FedEx, UPS"
                />
              </div>
            </div>

            <div>
              <label htmlFor="trackingNumberInput" className="block text-xs text-slate-600 mb-1 font-medium">Tracking Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="trackingNumberInput"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                  placeholder="e.g. 1Z999AA10123456784"
                />
              </div>
            </div>

            <div>
              <label htmlFor="trackingUrlInput" className="block text-xs text-slate-600 mb-1 font-medium">Tracking Link (URL)</label>
              <div className="relative">
                <input
                  id="trackingUrlInput"
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full border border-slate-200 rounded-md pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                  placeholder="https://tracking.courier.com/track/XYZ"
                />
              </div>
            </div>

            <div>
              <label htmlFor="estimatedDeliveryInput" className="block text-xs text-slate-600 mb-1 font-medium">Estimated Delivery</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="estimatedDeliveryInput"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <motion.button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-md bg-slate-800 text-white flex items-center gap-2 disabled:opacity-70"
                whileTap={{ scale: 0.97 }}
              >
                {success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Saved
                  </>
                ) : loading ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Save & Ship
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 text-center">
            Update tracking info to notify your customer automatically.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrackingModal;
