"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/api/auth";
import type { LoginPayload, User } from "@/lib/api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    setLoading(true);

    try {
      const response = await authApi.getMe();
      setUser(response.user);
      return response.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginPayload) => {
    setLoading(true);

    try {
      const response = await authApi.login(data);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      fetchMe,
    }),
    [fetchMe, loading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
