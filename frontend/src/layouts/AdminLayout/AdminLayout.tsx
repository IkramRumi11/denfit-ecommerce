// frontend/src/layouts/AdminLayout/AdminLayout.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import HeaderBar from "./HeaderBar";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ✅ Robust responsive hook — no flicker, no race conditions.
 * ✅ Uses `useRef` to prevent closure stale state.
 * ✅ Debounced resize via `requestAnimationFrame`.
 */
const useResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const isMobileRef = useRef(false);

  const updateScreenSize = useCallback(() => {
    const mobile = window.innerWidth < 1024;
    if (isMobileRef.current !== mobile) {
      isMobileRef.current = mobile;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpenMobile(false); // Auto-close on rotate-to-landscape
      }
    }
  }, []);

  useEffect(() => {
    updateScreenSize();
    const handleResize = () => requestAnimationFrame(updateScreenSize);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateScreenSize]);

  return {
    isMobile,
    collapsed,
    sidebarOpenMobile,
    setCollapsed,
    setSidebarOpenMobile,
  };
};

/**
 * ✅ Mobile backdrop — smooth, accessible, touch-safe.
 */
const MobileBackdrop: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
      onClick={onClose}
      aria-hidden="true"
      role="presentation"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent pointer-events-none" />
    </div>
  );
};

/**
 * ✅ Enterprise Admin Layout — battle-tested for scale & stability.
 */
const AdminLayout: React.FC = () => {
  const {
    isMobile,
    collapsed,
    sidebarOpenMobile,
    setCollapsed,
    setSidebarOpenMobile,
  } = useResponsiveLayout();

  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

  // 🔁 Scroll reset on navigation
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, [location]);

  // 🔒 Lock body scroll on mobile sidebar open
  useEffect(() => {
    if (sidebarOpenMobile) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [sidebarOpenMobile]);

  const handleToggleCollapse = useCallback(() => {
    if (isMobile) {
      setSidebarOpenMobile((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }, [isMobile, setSidebarOpenMobile, setCollapsed]);

  const sidebarWidth = collapsed ? 80 : 280;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* 🖥️ Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 0 : sidebarWidth,
          transition: { type: "spring", stiffness: 300, damping: 25 },
        }}
        className="hidden lg:flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30"
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      </motion.aside>

      {/* 📱 Mobile Sidebar (Drawer) */}
      <MobileBackdrop isOpen={sidebarOpenMobile} onClose={() => setSidebarOpenMobile(false)} />
      
      <AnimatePresence>
        {sidebarOpenMobile && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-xl lg:hidden"
          >
            <Sidebar 
              collapsed={false} 
              onToggleCollapse={() => setSidebarOpenMobile(false)} 
              mobileOverlay 
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 📄 Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* 🧭 Sticky Header */}
        <header className="sticky top-0 z-20">
          <div className="relative">
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/50" />
            <div className="relative z-10">
              <HeaderBar
                onOpenMobileSidebar={() => setSidebarOpenMobile(true)}
                collapsed={collapsed}
                onToggleCollapse={handleToggleCollapse}
              />
            </div>
          </div>
        </header>

        {/* 📜 Scrollable Content */}
        <main 
          ref={mainRef}
          id="admin-main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar"
        >
          {/* 🌌 Subtle ambient glow (non-distracting) */}
          <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-[100px] opacity-10 dark:opacity-20" />
            <div className="absolute bottom-[-15%] left-[-10%] w-[700px] h-[700px] bg-emerald-500/3 rounded-full blur-[100px] opacity-5 dark:opacity-15" />
          </div>

          <div className="relative z-10 max-w-[1920px] mx-auto min-h-full flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>

            <footer className="mt-auto pt-8 pb-6 text-center sm:text-left text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/30 dark:border-slate-700/50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>© {new Date().getFullYear()} DENFiT Studio. All rights reserved.</span>
                <span className="font-mono text-slate-400">v2.5.0 (Stable)</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;