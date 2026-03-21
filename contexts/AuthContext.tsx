"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, UserData, setToken, clearToken } from "@/lib/api";
import { resetSocket } from "@/lib/socket";

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: userData } = await api.me();
      setUser(userData);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("parle-moi-token");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: userData } = await api.login({ email, password });
    setToken(token);
    setUser(userData);
    resetSocket(); // reconnect with auth
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const { token, user: userData } = await api.register({ email, name, password });
    setToken(token);
    setUser(userData);
    resetSocket(); // reconnect with auth
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    resetSocket(); // reconnect without auth
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
