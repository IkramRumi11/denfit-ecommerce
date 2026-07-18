// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { api } from "../api";
import socket from '../sockets/socket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔐 Check if session exists (token)
  const hasCheckedAuth = React.useRef(false);
  const checkAuth = useCallback(async () => {
    try {
      // Rely on httpOnly cookie authentication; attempt to fetch the current
      // user session from the server. If it fails, treat as unauthenticated.
      const res: any = await api.auth.getMe();
      if (res?.data?.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
        try { socket.initSocket(); } catch (e) {}
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.warn("Auth check failed or no active session");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prevent duplicate auth check from React StrictMode double-mount
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    checkAuth();
  }, [checkAuth]);

  // Listen for global logout events (dispatched by api on 401 recovery)
  useEffect(() => {
    const onLoggedOut = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('app:loggedOut', onLoggedOut as EventListener);
    return () => window.removeEventListener('app:loggedOut', onLoggedOut as EventListener);
  }, []);

  // 🧭 Login
  const login = async (email: string, password: string) => {
    const res: any = await api.auth.login(email, password);
    // If server returned a user, establish client session state
    if (res?.data?.user) {
      setUser(res.data.user);
      setIsAuthenticated(true);
      try { socket.initSocket(); } catch (e) {}
      return res;
    }

    // If login didn't return user (for example, unverified email), let the caller
    // inspect the response (it may contain emailVerified:false and canResendVerification)
    try {
      const me: any = await api.auth.getMe();
      if (me?.data?.user) {
        setUser(me.data.user);
        setIsAuthenticated(true);
      }
    } catch (e) {
      // ignore
    }
    return res;
  };

  // 🧭 Register
  const register = async (data: { name: string; email: string; password: string; phone?: string }) => {
    const res: any = await api.auth.register(data);
    if (res?.data?.user) {
      setUser(res.data.user);
      setIsAuthenticated(true);
      try { socket.initSocket(); } catch (e) {}
      return res;
    }

    try {
      const me: any = await api.auth.getMe();
      if (me?.data?.user) {
        setUser(me.data.user);
        setIsAuthenticated(true);
      }
    } catch (e) {
      // ignore
    }

    return res;
  };

  // 🚪 Logout
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      // server clears cookie; just clear client state
      try { socket.disconnect(); } catch (e) {}
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 🧾 Update user
  const updateUser = async (data: Partial<User>) => {
    const res: any = await api.auth.updateMe(data);
    if (res?.data?.user) setUser(res.data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateUser,
        setUser,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
