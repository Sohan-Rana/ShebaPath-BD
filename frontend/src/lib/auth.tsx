"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, TOKEN_KEY } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

interface TokenResponse {
  access_token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let token: string | null = null;
    try {
      token = window.localStorage.getItem(TOKEN_KEY);
    } catch {}
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api<User>("/api/auth/me"));
    } catch {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch {}
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const finish = (res: TokenResponse) => {
    try {
      window.localStorage.setItem(TOKEN_KEY, res.access_token);
    } catch {}
    setUser(res.user);
    return res.user;
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email, password) =>
        finish(await api<TokenResponse>("/api/auth/login", { method: "POST", body: { email, password } })),
      register: async (data) => finish(await api<TokenResponse>("/api/auth/register", { method: "POST", body: data })),
      logout: () => {
        try {
          window.localStorage.removeItem(TOKEN_KEY);
        } catch {}
        setUser(null);
      },
    }),
    [user, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Protected route helper: login na thakle /login e pathay; admin: true hole admin lagbe. */
export function useRequireAuth(opts: { admin?: boolean } = {}) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (opts.admin && auth.user.role_name !== "admin") router.replace("/dashboard");
  }, [auth.loading, auth.user, opts.admin, router]);
  const allowed = !!auth.user && (!opts.admin || auth.user.role_name === "admin");
  return { ...auth, allowed };
}
