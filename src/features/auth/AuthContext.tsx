import React, { ReactNode, createContext, useContext, useMemo, useState } from "react";
import { loadState, saveState } from "../../lib/storage";

const AUTH_ACCOUNT_KEY = "nexus-finance:auth-account";
const AUTH_SESSION_KEY = "nexus-finance:auth-session";

interface AuthAccount {
  createdAt: string;
  email: string;
  name: string;
  passwordHash: string;
}

interface AuthSession {
  email: string;
  loginAt: string;
  name: string;
}

interface AuthContextValue {
  account: AuthAccount | null;
  hasAccount: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  session: AuthSession | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const digest = await crypto.subtle.digest("SHA-256", passwordBuffer);
  const digestArray = Array.from(new Uint8Array(digest));

  return digestArray.map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(() => loadState<AuthAccount | null>(AUTH_ACCOUNT_KEY, null));
  const [session, setSession] = useState<AuthSession | null>(() => loadState<AuthSession | null>(AUTH_SESSION_KEY, null));

  const register = async (name: string, email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const nextAccount: AuthAccount = {
      createdAt: new Date().toISOString(),
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: await hashPassword(password),
    };
    const nextSession: AuthSession = {
      email: normalizedEmail,
      loginAt: new Date().toISOString(),
      name: name.trim(),
    };

    setAccount(nextAccount);
    setSession(nextSession);
    saveState(AUTH_ACCOUNT_KEY, nextAccount);
    saveState(AUTH_SESSION_KEY, nextSession);
  };

  const login = async (email: string, password: string) => {
    if (!account) {
      throw new Error("Nenhum acesso cadastrado ainda.");
    }

    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashPassword(password);

    if (normalizedEmail !== account.email || passwordHash !== account.passwordHash) {
      throw new Error("Email ou senha incorretos.");
    }

    const nextSession: AuthSession = {
      email: account.email,
      loginAt: new Date().toISOString(),
      name: account.name,
    };

    setSession(nextSession);
    saveState(AUTH_SESSION_KEY, nextSession);
  };

  const logout = () => {
    setSession(null);
    saveState<AuthSession | null>(AUTH_SESSION_KEY, null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      hasAccount: Boolean(account),
      isReady: true,
      login,
      logout,
      register,
      session,
    }),
    [account, session]
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
