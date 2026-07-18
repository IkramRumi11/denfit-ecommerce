// frontend/src/layouts/AdminLayout/HeaderBar.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Bell, Search, Sun, Moon, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useToast } from "../../context/ToastContext";

// ✅ Use your actual shadcn/ui imports
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from '../../utils/formatTime';

interface Props {
  onOpenMobileSidebar?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const HeaderBar: React.FC<Props> = ({ 
  onOpenMobileSidebar, 
  collapsed, 
  onToggleCollapse 
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { notifications: notifList = [], unreadCount, load } = useNotifications();

  // 🔁 Sync dark mode with system
  useEffect(() => {
    const updateDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setDark(isDark);
    };
    updateDarkMode();

    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // 🖱️ Close notifications on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [notifOpen]);

  useEffect(() => {
    // Load latest notifications when header mounts
    try {
      load?.(1);
    } catch (e) {}
  }, [load]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      showToast("Signed out successfully", "success");
    } catch (err) {
      console.error("Logout failed:", err);
      showToast("Could not sign out. Please try again.", "error");
    }
  };

  const toggleDark = useCallback(() => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [dark]);

  // ✅ Realistic initials: First + Last initial, fallback to first char
  const getInitials = useCallback((name: string | undefined): string => {
    if (!name) return "A";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, []);

  return (
    <header className="h-16 flex items-center gap-4 px-4 sm:px-6">
      {/* 📱 Mobile Hamburger */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* 💻 Desktop Collapse Toggle */}
      <div className="hidden md:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* 🔍 Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, customers, products…"
            className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            aria-label="Global search"
          />
        </div>
      </div>

      {/* 🔔 Right Controls */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {dark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 relative"
          >
            <Bell className="w-5 h-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 text-[10px] px-1.5 h-4 font-normal"
            >
              {unreadCount ?? 0}
            </Badge>
          </Button>

          {/* Dropdown */}
          {notifOpen && (
            <div 
              className="absolute right-0 mt-2 w-80 z-50"
              role="region"
              aria-label="Recent notifications"
            >
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-sm">Notifications</span>
                  <button
                    onClick={() => navigate("/admin/audits")}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    View all
                  </button>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  {(notifList || []).slice(0, 3).map((n: any) => (
                    <div
                      key={n._id || n.id}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setNotifOpen(false);
                        // Prefer order-related navigation when available in metadata
                        const targetOrder = n?.metadata?.orderId || n?.metadata?.orderNumber || n?.orderNumber;
                        if (targetOrder) navigate(`/admin/orders/${targetOrder}`);
                        else navigate('/admin/audits');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="pr-4">
                          <div className="font-medium text-sm">{n.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{n.message || n.desc}</div>
                        </div>
                        <div className="text-right text-xs text-slate-400 ml-2">
                          <div className="text-[11px]">{(n.type || '').toLowerCase() === 'order' ? 'Placed' : 'At'}</div>
                          <div className="text-[11px] mt-1">{n.createdAt ? formatRelativeTime(n.createdAt) : ''}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👤 Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="p-1 h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Open user menu"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={user?.avatar || undefined} 
                  alt={user?.name || "User"}
                />
                <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-600 text-white font-medium">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || "Admin User"}</p>
                <p className="text-xs text-slate-500">{user?.email || "—"} </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/audits")}>
              Security Logs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default HeaderBar;