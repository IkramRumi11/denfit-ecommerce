// frontend/src/layouts/AdminLayout/Sidebar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, LogOut, Home } from "lucide-react";
import adminMenu from "./adminMenu";
import { useAuth } from "../../context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";

interface Props {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOverlay?: boolean;
}

const Sidebar: React.FC<Props> = ({ 
  collapsed = false, 
  onToggleCollapse, 
  mobileOverlay = false 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const allowedMenu = adminMenu.filter((item) => {
    if (!item.permission) return user?.role === "admin";
    return user?.role === "admin" || (user?.permissions || []).includes(item.permission);
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return "A";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  };

  return (
    <nav 
      aria-label="Main navigation"
      className="flex h-full flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* 🔝 Fixed Top Section (Logo & Collapse) */}
      <div className="flex-shrink-0 p-4 border-b border-slate-100 dark:border-slate-700/40">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-sm"
            aria-hidden="true"
          >
            D
          </div>
          {!collapsed && (
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">DENFiT</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Admin</div>
            </div>
          )}

          {/* Desktop collapse toggle */}
          {!mobileOverlay && !collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="ml-auto p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 📜 Scrollable Navigation Menu */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
        <ul className={`space-y-1 ${collapsed ? "items-center" : ""}`}>
          {allowedMenu.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end
                onClick={() => mobileOverlay && onToggleCollapse?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                  } ${collapsed ? "justify-center px-2 py-3" : ""}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* 👇 Fixed Bottom User */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-600 text-white text-xs font-medium">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {user?.name || "Admin"}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.role === "admin" ? "Administrator" : "Staff"}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile close */}
            {mobileOverlay && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                aria-label="Close menu"
                className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Sign out"
              className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;