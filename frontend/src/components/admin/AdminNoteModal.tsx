// frontend/src/components/admin/AdminNoteModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  order: any;
  to: string;
  onClose: () => void;
  onConfirm: (note?: string) => Promise<void> | void;
  isOpen: boolean;
}

export const AdminNoteModal: React.FC<ModalProps> = ({ 
  order, 
  to, 
  onClose, 
  onConfirm, 
  isOpen 
}) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Define handleSubmit first before using it in effects
  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      await onConfirm(note.trim() || undefined);
      // Don't close here - let parent handle it after confirmation
    } catch (error) {
      console.error("Failed to confirm status change:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, onConfirm, note]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNote("");
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
        handleSubmit(e as any);
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, loading, handleSubmit]);

  const getTargetStatusConfig = () => {
    const config = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", icon: "⏳" },
      processing: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", icon: "⚙️" },
      shipped: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", icon: "🚚" },
      delivered: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", icon: "✅" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: "❌" }
    };
    return config[to as keyof typeof config] || config.pending;
  };

  const statusConfig = getTargetStatusConfig();

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Enhanced Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Supercharged Modal */}
        <motion.div
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto z-10 border border-gray-200 dark:border-gray-700"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            duration: 0.2
          }}
        >
          {/* Header with Status Badge */}
          <div className="flex-shrink-0 flex items-center gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
            <div className={`p-2 rounded-lg ${statusConfig.bg} ${statusConfig.border}`}>
              <span className="text-lg">{statusConfig.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Update Order Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Confirm status change for order
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {/* Order Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {order?.orderNumber || order?.id}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {(() => {
                      const c = order?.customer;
                      if (!c) return 'Customer';
                      if (typeof c === 'string') return c;
                      return c.name || c.email || 'Customer';
                    })()}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Current:</span>
                  <span className="capitalize px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {order.status}
                  </span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className={`capitalize px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                    {to}
                  </span>
                </div>
              </div>

              {/* Enhanced Textarea */}
              <div>
                <label htmlFor="adminNote" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Admin Note <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea
                  id="adminNote"
                  ref={textareaRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 shadow-sm resize-none"
                  rows={3}
                  placeholder="Add a note about this status change... (Ctrl+Enter to submit)"
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Add context for this status update</span>
                  <span>{note.length}/500</span>
                </div>
              </div>

              {/* Quick Note Suggestions */}
              {note.length === 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick notes:</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Customer requested update",
                      "Package shipped successfully",
                      "Delivery confirmed",
                      "Processing payment"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setNote(suggestion)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Action Buttons */}
            <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <motion.svg
                      className="animate-spin h-4 w-4 text-white"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </motion.svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Set {to}</span>
                    <span className="text-xs opacity-80">↵</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminNoteModal;