import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

const DeleteConfirm: React.FC<Props> = ({ open, title = 'Confirm delete', description = 'This action cannot be undone.', confirmLabel = 'Delete', busy = false, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, rotateY: -18, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, rotateY: 12, scale: 0.98, y: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6"
            style={{ perspective: 800 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-700">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={onClose} className="px-3 py-2 rounded-md border hover:bg-slate-50">Cancel</button>
                  <button
                    onClick={async () => { await onConfirm(); }}
                    disabled={busy}
                    className="px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-60"
                  >
                    {busy ? 'Working...' : confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirm;
