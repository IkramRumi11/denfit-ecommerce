// frontend/src/layouts/AdminLayout/AdminLayout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { AnimatePresence, motion } from 'framer-motion';

// Custom hook for responsive behavior
const useResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setSidebarOpenMobile(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile sidebar when route changes
  const location = useLocation();
  useEffect(() => {
    if (sidebarOpenMobile) {
      setSidebarOpenMobile(false);
    }
  }, [location, sidebarOpenMobile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (isMobile) {
          setSidebarOpenMobile(prev => !prev);
        } else {
          setCollapsed(prev => !prev);
        }
      }
      
      // Escape to close mobile sidebar
      if (e.key === 'Escape' && sidebarOpenMobile) {
        setSidebarOpenMobile(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isMobile, sidebarOpenMobile]);

  return {
    isMobile,
    collapsed,
    sidebarOpenMobile,
    setCollapsed,
    setSidebarOpenMobile
  };
};

// Backdrop component for mobile overlay
const MobileBackdrop: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void 
}> = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
    )}
  </AnimatePresence>
);

const AdminLayout: React.FC = () => {
  const {
    isMobile,
    collapsed,
    sidebarOpenMobile,
    setCollapsed,
    setSidebarOpenMobile
  } = useResponsiveLayout();

  const location = useLocation();

  // Smooth scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  // Handle body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpenMobile]);

  const handleToggleCollapse = useCallback(() => {
    if (isMobile) {
      setSidebarOpenMobile(false);
    } else {
      setCollapsed(prev => !prev);
    }
  }, [isMobile, setCollapsed, setSidebarOpenMobile]);

  const handleCloseMobileSidebar = useCallback(() => {
    setSidebarOpenMobile(false);
  }, [setSidebarOpenMobile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/10 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="flex relative">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ 
            width: collapsed ? 80 : 288,
            transition: { type: "spring", stiffness: 300, damping: 30 }
          }}
          className="hidden md:flex md:flex-col h-screen sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-r border-slate-200/60 dark:border-slate-700/60 shadow-sm z-20"
        >
          <Sidebar 
            collapsed={collapsed} 
            onToggleCollapse={handleToggleCollapse} 
          />
        </motion.aside>

        {/* Mobile Sidebar Overlay */}
        <MobileBackdrop 
          isOpen={sidebarOpenMobile} 
          onClose={handleCloseMobileSidebar} 
        />

        {/* Mobile Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpenMobile && (
            <motion.div
              key="mobile-sidebar"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 40,
                duration: 0.2
              }}
              className="fixed inset-y-0 left-0 z-40 w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-r border-slate-200/60 dark:border-slate-700/60 shadow-2xl md:hidden"
            >
              <Sidebar
                collapsed={false}
                onToggleCollapse={handleCloseMobileSidebar}
                mobileOverlay
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <motion.div 
          className="flex-1 min-h-screen flex flex-col"
          initial={false}
          animate={{
            marginLeft: isMobile ? 0 : (collapsed ? 80 : 288),
            transition: { type: "spring", stiffness: 300, damping: 30 }
          }}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <HeaderBar
              onOpenMobileSidebar={() => setSidebarOpenMobile(true)}
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.995 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeOut"
                }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      </div>

      {/* Performance Optimizations */}
      <style>{`
        /* Smooth scrolling for the entire app */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .dark ::-webkit-scrollbar-thumb {
          background: #475569;
        }
        
        .dark ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
  `}</style>
    </div>
  );
};

// Add display name for better debugging
AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;