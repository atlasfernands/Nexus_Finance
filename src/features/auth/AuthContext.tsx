import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { LEGAL_DOCUMENT_VERSION } from "../../legal/legalDocuments";
import { acceptRequiredLegalDocuments } from "../../services/legal";

interface AuthContextValue {
  hasAccount: boolean;
  isConfigured: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, legalAccepted: boolean) => Promise<void>;
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthClient() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  return supabase;
}

async function syncAcceptedLegalDocuments(session: Session | null) {
  if (!session?.access_token || !session.user.user_metadata?.legal_terms_accepted) {
    return;
  }

  try {
    await acceptRequiredLegalDocuments(session.access_token);
  } catch (error) {
    console.warn("Nao foi possivel sincronizar aceite legal agora.", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Falha ao carregar sessao do Supabase", error);
      }

      void syncAcceptedLegalDocuments(data.session ?? null);
      setSession(data.session ?? null);
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const register = async (name: string, email: string, password: string, legalAccepted: boolean) => {
    if (!legalAccepted) {
      throw new Error("Voce precisa aceitar os Termos de Uso e a Politica de Privacidade.");
    }

    const client = getAuthClient();
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const acceptedAt = new Date().toISOString();
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          legal_terms_accepted: true,
          legal_terms_version: LEGAL_DOCUMENT_VERSION,
          legal_privacy_version: LEGAL_DOCUMENT_VERSION,
          legal_accepted_at: acceptedAt,
          legal_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      throw error;
    }

    await syncAcceptedLegalDocuments(data.session ?? null);
    setSession(data.session ?? null);
  };

  const login = async (email: string, password: string) => {
    const client = getAuthClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    await syncAcceptedLegalDocuments(data.session);
    setSession(data.session);
  };

  const logout = async () => {
    const client = getAuthClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      hasAccount: Boolean(session?.user),
      isConfigured: isSupabaseConfigured,
      isReady,
      login,
      logout,
      register,
      session,
      user: session?.user ?? null,
    }),
    [isReady, session]
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
