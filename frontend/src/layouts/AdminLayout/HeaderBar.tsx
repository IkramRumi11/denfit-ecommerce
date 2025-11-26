import React, { useState } from "react";
import { Bell, Search, Sun, Moon, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

/**
 * shadcn/ui components pattern - adapt imports to your project structure if needed.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Props {
  onOpenMobileSidebar?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const HeaderBar: React.FC<Props> = ({ onOpenMobileSidebar, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
      showToast("Logout failed", "error");
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  return (
    <header className="w-full">
      <div className="flex items-center gap-4 px-4 sm:px-6 lg:px-8 h-16">
        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={onOpenMobileSidebar} aria-label="Open sidebar" className="p-1">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Desktop collapse toggle */}
        <div className="hidden md:flex items-center">
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="p-1">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="relative"
          >
            <Input
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              placeholder="Search orders, users, products..."
              aria-label="Search orders, users, products"
              className="pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
          </motion.div>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-3">
          {/* Light/Dark toggle */}
          <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme" className="p-1">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="p-1"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <div className="absolute -top-1 -right-1">
              <Badge variant="destructive" className="text-xs">2</Badge>
            </div>

            {/* Notification flyout */}
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3"
              >
                <div className="text-sm font-semibold mb-2">Notifications</div>
                <div className="flex flex-col gap-2">
                  <div className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    <div className="text-sm font-medium">New Order Received</div>
                    <div className="text-xs text-slate-500">Order ORD-1001 was placed 2m ago</div>
                  </div>
                  <div className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    <div className="text-sm font-medium">Low Stock Alert</div>
                    <div className="text-xs text-slate-500">Classic Kurta is running low</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Button variant="link" onClick={() => navigate("/admin/audits")}>View all</Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="User menu" className="flex items-center gap-2 focus:outline-none">
                <Avatar>
                  <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Admin")}&background=111827&color=fff&bold=true`} alt={user?.name || "Admin"} />
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{user?.name || "Admin User"}</div>
                <div className="text-xs text-slate-500">{user?.email || "admin@example.com"}</div>
              </div>
              <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/audits")}>Audit Logs</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
