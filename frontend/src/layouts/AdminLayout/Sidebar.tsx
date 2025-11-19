import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import adminMenu from "./adminMenu";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";

/**
 * NOTE: shadcn/ui components path used here as project convention.
 * If your project uses a different import path, adjust these imports.
 */
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Props {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOverlay?: boolean;
}

const Sidebar: React.FC<Props> = ({ collapsed = false, onToggleCollapse, mobileOverlay = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Keep menu structure but filter by permissions/role as before
  const allowedMenu = adminMenu.filter((m) => {
    if (!m.permission) return user?.role === "admin"; // default to admin-only if permission missing
    if (Array.isArray(user?.permissions)) return user.permissions.includes(m.permission) || user.role === "admin";
    return user?.role === "admin";
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getAvatarUrl = () => {
    if (user?.avatar) return user.avatar;
    const name = user?.name || "Admin User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111827&color=fff&bold=true`;
  };

  return (
    <nav
      aria-label="Admin primary"
      className="h-full bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-between"
      role="navigation"
    >
      <div className="p-4">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div
            aria-hidden
            className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white bg-gradient-to-br from-slate-700 to-slate-500"
          >
            D
          </div>

          {!collapsed && (
            <div className="flex flex-col">
              <div className="text-lg font-bold">DENFiT</div>
              <div className="text-xs text-slate-500">Admin Console</div>
            </div>
          )}

          {/* collapse/expand control for desktop */}
          <div className="ml-auto md:flex hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapse}
              className="p-1"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
            {allowedMenu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                title={m.label}
                end
                onClick={() => mobileOverlay && onToggleCollapse && onToggleCollapse()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${isActive ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"}`
                }
              >
                <div aria-hidden className="w-5 h-5 text-slate-600 dark:text-slate-300">
                  {m.icon}
                </div>
                {!collapsed && <span>{m.label}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar>
              <img src={getAvatarUrl()} alt={user?.name || "Admin"} />
            </Avatar>

            {!collapsed && (
              <div>
                <div className="text-sm font-semibold">{user?.name || "Admin User"}</div>
                <div className="text-xs text-slate-500">{user?.role === "admin" ? "Admin" : "User"}</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile toggle (visible only on mobile) */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                aria-label="Close sidebar"
                className="p-1"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
