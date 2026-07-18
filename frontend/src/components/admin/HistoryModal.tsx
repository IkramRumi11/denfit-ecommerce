// frontend/src/components/admin/HistoryModal.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, User, ArrowRight, FileText, CheckCircle2, Package, Truck, XCircle, X } from "lucide-react";

/** Strongly-typed history item */
export interface StatusHistoryItem {
  id?: string; // optional id for keys
  from?: string;
  to: string;
  at: string; // ISO date
  by?: string;
  byName?: string;
  note?: string;
}

interface Props {
  order: { orderNumber?: string; _id?: string; statusHistory?: StatusHistoryItem[] } | null;
  onClose: () => void;
}

/* ---------------- helpers (pure, avoids re-creation) ---------------- */
const getStatusIcon = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return <Clock className="w-4 h-4" />;
  if (s.includes("processing")) return <Package className="w-4 h-4" />;
  if (s.includes("shipped") || s.includes("transit")) return <Truck className="w-4 h-4" />;
  if (s.includes("delivered") || s.includes("complete")) return <CheckCircle2 className="w-4 h-4" />;
  if (s.includes("cancel")) return <XCircle className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const getStatusGradient = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return "from-slate-400 to-slate-600";
  if (s.includes("processing")) return "from-blue-500 to-sky-600";
  if (s.includes("shipped") || s.includes("transit")) return "from-indigo-500 to-violet-600";
  if (s.includes("delivered") || s.includes("complete")) return "from-emerald-500 to-teal-500";
  if (s.includes("cancel")) return "from-rose-500 to-red-600";
  return "from-gray-400 to-gray-600";
};

const getBadgeStyle = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return "bg-slate-100 text-slate-800 border-slate-200";
  if (s.includes("processing")) return "bg-sky-50 text-sky-700 border-sky-100";
  if (s.includes("shipped") || s.includes("transit")) return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (s.includes("delivered") || s.includes("complete")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (s.includes("cancel")) return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-gray-50 text-gray-800 border-gray-100";
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
};

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const now = Date.now();
  const past = new Date(iso).getTime();
  const diffMs = Math.max(0, now - past);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

/* ---------------- motion variants ---------------- */
const backdropVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const containerVariant = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.12 } },
};

const listVariant = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  hidden: {},
};

const itemVariant = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, x: -6, transition: { duration: 0.12 } },
};

/* ---------------- component ---------------- */
const HistoryModal: React.FC<Props> = ({ order, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);

  const history: StatusHistoryItem[] = order?.statusHistory ? [...order.statusHistory] : [];

  // open with animation
  useEffect(() => {
    document.body.style.overflow = "hidden"; // scroll lock
    setIsVisible(true);
    // focus management: focus the close button after mount
    setTimeout(() => firstFocusRef.current?.focus(), 120);
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape to close & trap focus tabbing in modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        // Close immediately for keyboard Escape - call parent close
        onClose();
      } else if (e.key === "Tab") {
        // focus trap
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // click-outside detection
  const handleWrapperClick = useCallback(
    (e: React.MouseEvent) => {
      if (!modalRef.current) return;
      if (e.target instanceof Node && !modalRef.current.contains(e.target)) {
        onClose();
      }
    },
    [modalRef, onClose]
  );

  const handleClose = useCallback(() => {
    setIsVisible(false);
    // allow animation out before calling parent's onClose
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  const reversed = [...history].reverse();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        exit="exit"
        onMouseDown={handleWrapperClick} // detect clicks outside modal container
      >
        {/* Backdrop */}
        <motion.div
          variants={backdropVariant}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          variants={containerVariant}
          className="relative z-10 w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-title"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <FileText className="w-5 h-5 text-white/90" />
                  </div>
                  <div>
                    <h3 id="history-title" className="text-lg font-semibold">
                      Order Timeline
                    </h3>
                    <p className="text-sm text-slate-200/90 mt-1">
                      Order ID:{" "}
                      <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-sm">{order?.orderNumber ?? order?._id ?? "-"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <button
                  ref={firstFocusRef}
                  aria-label="Close history"
                  onClick={handleClose}
                  className="p-2 rounded-md hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5 text-white/90" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto" aria-live="polite">
            {reversed.length === 0 ? (
              <div className="py-12 text-center text-slate-600">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                  <Clock className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-lg font-medium">No history recorded</div>
                <div className="text-sm mt-2 text-slate-500">All status updates will show up here.</div>
              </div>
            ) : (
              <motion.div variants={listVariant} initial="hidden" animate="visible" className="relative">
                {/* vertical line */}
                <div className="absolute left-8 top-2 bottom-2 w-[2px] bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" aria-hidden />

                <div className="space-y-6">
                  {reversed.map((item, idx) => {
                    const key = item.id ?? `${item.to}-${item.at}-${idx}`;
                    const grad = getStatusGradient(item.to);
                    const badge = getBadgeStyle(item.to);
                    const open = selected === key;

                    return (
                      <motion.div key={key} variants={itemVariant} className="relative group">
                        {/* Dot / icon */}
                        <div className={`absolute left-0 top-2 w-10 h-10 rounded-full bg-gradient-to-br ${grad} shadow-md flex items-center justify-center text-white transform transition-transform group-hover:scale-105`}>
                          {getStatusIcon(item.to)}
                        </div>

                        {/* Card */}
                        <div
                          className={`pl-14 cursor-pointer`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected((s) => (s === key ? null : key))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelected((s) => (s === key ? null : key));
                            }
                          }}
                        >
                          <div className={`bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition`}>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {item.from && (
                                      <>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle(item.from)}`}>
                                          {item.from}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                      </>
                                    )}
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge}`}>
                                      {item.to}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-4 items-center text-sm text-slate-600">
                                    <div className="inline-flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-slate-400" />
                                      <span className="font-medium">{timeAgo(item.at)}</span>
                                    </div>

                                    <div className="inline-flex items-center gap-2">
                                      <User className="w-4 h-4 text-slate-400" />
                                      <span className="text-slate-700">{item.byName ?? item.by ?? "System"}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-xs text-slate-400 font-mono">{reversed.length - idx}</div>
                              </div>

                              {item.note && (
                                <div className={`mt-3 pt-3 border-t border-slate-100 ${open ? "" : "hidden"}`}>
                                  <div className="flex items-start gap-3">
                                    <FileText className="w-4 h-4 text-slate-500 mt-1" />
                                    <div>
                                      <p className="text-xs font-semibold text-slate-700">Note</p>
                                      <p className="text-sm text-slate-600 leading-relaxed">{item.note}</p>
                                      <p className="text-xs text-slate-400 mt-2">{formatDate(item.at)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* accent bar */}
                            <div className={`h-1 bg-gradient-to-r ${grad} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{history.length}</span> {history.length === 1 ? "update" : "updates"}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-900 transition">
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HistoryModal;
