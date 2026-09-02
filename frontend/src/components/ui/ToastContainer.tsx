import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast } from '../../types';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const toastConfigs = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    progressBar: 'bg-emerald-500',
    border: 'border-emerald-100/80',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    progressBar: 'bg-rose-500',
    border: 'border-rose-100/80',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    progressBar: 'bg-amber-500',
    border: 'border-amber-100/80',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    progressBar: 'bg-blue-500',
    border: 'border-blue-100/80',
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none gap-2.5">
      <div className="w-full max-w-sm space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = toastConfigs[toast.type] || toastConfigs.info;
            const Icon = config.icon;
            const durationSec = ((toast.duration || toast.timeout || 5000) / 1000);

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 40, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className={`relative overflow-hidden flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/95 backdrop-blur-md border ${config.border} shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto select-none`}
              >
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.iconBg} ${config.iconColor} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Message & Title */}
                <div className="flex-1 min-w-0 pr-1">
                  {toast.title && (
                    <p className="text-xs font-semibold text-gray-900 leading-tight mb-0.5">
                      {toast.title}
                    </p>
                  )}
                  <p className="text-xs font-medium text-gray-800 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => onRemove(toast.id)}
                  className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Progress / Timeout Line (PTA/DIRBS Style) */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gray-100 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: durationSec, ease: 'linear' }}
                    className={`h-full ${config.progressBar}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};