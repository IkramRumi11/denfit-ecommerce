import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

const mockNotifs = [
  { id: 'n1', title: 'Order ORD-1001 shipped', time: '2h ago' },
  { id: 'n2', title: 'New user registered', time: '4h ago' },
  { id: 'n3', title: 'High-value order placed', time: '1d ago' },
];

const NotificationPanel: React.FC<Props> = ({ open, onClose }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          ref={ref}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
        >
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between">
            <div className="font-semibold">Notifications</div>
            <button
              onClick={() => alert('See all notifications')}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              See all
            </button>
          </div>
          <div className="p-2">
            {mockNotifs.map((n) => (
              <button
                key={n.id}
                onClick={() => alert(n.title)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-md bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                  🔔
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-slate-500">{n.time}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
