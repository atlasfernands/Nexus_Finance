import { TransactionSubcategory, TransactionType } from "../types";
import { getEnvVar } from "../lib/env";

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

export async function requestAIAnalysis(
  request: AIAnalysisRequest,
  accessToken: string
): Promise<AIAnalysisResponse> {
  const apiBaseUrl = getEnvVar("API_BASE_URL");
  const response = await fetch(`${apiBaseUrl}/api/analyze-finance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
