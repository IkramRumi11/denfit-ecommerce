import React, { useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info, AlertTriangle } from "lucide-react";
import { formatRelativeTime } from '../../utils/formatTime';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  const { notifications = [], load, markRead, markAllRead } = useNotifications();

  // Only fetch notifications when the panel is opened (not on every mount)
  useEffect(() => {
    if (open) {
      try { load?.(1); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getIcon = (type: string | undefined) => {
    switch ((type || '').toLowerCase()) {
      case 'order':
      case 'success':
        return <Check size={14} />;
      case 'warning':
      case 'stock':
        return <AlertTriangle size={14} />;
      default:
        return <Info size={14} />;
    }
  };

  const handleItemClick = async (n: any) => {
    try {
      if (n && (n._id || n.id)) await markRead?.(n._id || n.id);
    } catch (e) {
      console.error('markRead failed', e);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-12 w-80 z-50 bg-white dark:bg-[#151720] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <button
              onClick={() => { try { markAllRead?.(); } catch (e) {} }}
              className="text-xs text-indigo-500 cursor-pointer hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {(!notifications || notifications.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-sm">No new notifications</div>
            ) : (
              (notifications || []).map((n: any) => (
                <div
                  key={n._id || n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex gap-3 ${n.isRead ? 'opacity-60' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-700`}>
                    {getIcon(n.type || n.metadata?.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message || n.msg}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400 ml-2">
                        <div className="text-[11px]">{(n.type || '').toLowerCase() === 'order' ? 'Placed' : 'At'}</div>
                        <div className="text-[11px] mt-1">{n.createdAt ? formatRelativeTime(n.createdAt) : ''}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-900/50 text-center">
            <button className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-500">View History</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;