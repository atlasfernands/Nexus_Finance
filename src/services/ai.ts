import { TransactionSubcategory, TransactionType } from "../types";
import { getEnvVar } from "../lib/env";
import { supabase } from "../lib/supabase";

export interface AIAnalysisRequest {
  transactions: Array<{
    date: string;
    description: string;
    subcategory: TransactionSubcategory | string;
    type: TransactionType | string;
    amount: number;
  }>;
  profile: {
    name: string;
    store: string;
    goal: number;
  };
  metrics: {
    currentPeriodLabel: string;
    saldoRealizado: number;
    saldoProjetado: number;
    entradasMes: number;
    saidasMes: number;
    saldoLoja: number;
    metaAtingidaPercent: number;
  };
}

export interface AIAnalysisResponse {
  fullAnalysis: string;
}

async function getCurrentAccessToken(fallbackAccessToken: string): Promise<string> {
  if (!supabase) {
    return fallbackAccessToken;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error("Sessao expirada. Entre novamente para gerar o diagnostico.");
  }

  const currentSession = data.session;
  if (!currentSession?.access_token) {
    return fallbackAccessToken;
  }

  const expiresAt = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
  const shouldRefresh = expiresAt > 0 && expiresAt <= Date.now() + 60_000;
  const { data: userData, error: userError } = await supabase.auth.getUser(currentSession.access_token);

  if (!userError && userData.user && !shouldRefresh) {
    return currentSession.access_token;
  }

  const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession(currentSession);
  if (refreshError || !refreshedData.session?.access_token) {
    throw new Error("Sessao expirada. Entre novamente para gerar o diagnostico.");
  }

  const { data: refreshedUserData, error: refreshedUserError } = await supabase.auth.getUser(
    refreshedData.session.access_token
  );
  if (refreshedUserError || !refreshedUserData.user) {
    throw new Error("Sessao expirada. Entre novamente para gerar o diagnostico.");
  }

  return refreshedData.session.access_token;
}

export async function requestAIAnalysis(
  request: AIAnalysisRequest,
  accessToken: string
): Promise<AIAnalysisResponse> {
  const apiBaseUrl = getEnvVar("API_BASE_URL");
  const currentAccessToken = await getCurrentAccessToken(accessToken);
  const response = await fetch(`${apiBaseUrl}/api/analyze-finance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<AIAnalysisResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.fullAnalysis) {
    throw new Error(payload.error ?? "Falha ao conectar com o Nexus AI Core.");
  }

  return {
    fullAnalysis: payload.fullAnalysis,
  };
}
