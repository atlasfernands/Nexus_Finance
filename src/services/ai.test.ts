import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIAnalysisRequest } from "./ai";

const mocks = vi.hoisted(() => ({
  getEnvVar: vi.fn(),
}));

vi.mock("../lib/env", () => ({
  getEnvVar: mocks.getEnvVar,
}));

import { requestAIAnalysis } from "./ai";

const sampleRequest: AIAnalysisRequest = {
  transactions: [
    {
      date: "2026-04-27",
      description: "Fornecedor",
      subcategory: "Loja",
      type: "Saida",
      amount: 320,
    },
  ],
  profile: {
    name: "Ana",
    store: "Atelie Nexus",
    goal: 3000,
  },
  metrics: {
    currentPeriodLabel: "Abril 2026",
    saldoRealizado: 1100,
    saldoProjetado: 850,
    entradasMes: 4200,
    saidasMes: 3350,
    saldoLoja: 2500,
    metaAtingidaPercent: 72,
  },
};

describe("requestAIAnalysis", () => {
  beforeEach(() => {
    mocks.getEnvVar.mockReturnValue("http://127.0.0.1:3002");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("calls the API with bearer auth and returns the analysis", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ fullAnalysis: "Analise pronta" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAIAnalysis(sampleRequest, "access-token");

    expect(result).toEqual({ fullAnalysis: "Analise pronta" });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3002/api/analyze-finance", {
      method: "POST",
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sampleRequest),
    });
  });

  it("surfaces server-side diagnostic errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Sessao invalida." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIAnalysis(sampleRequest, "access-token")).rejects.toThrow("Sessao invalida.");
  });

  it("uses a generic message when the response body has no analysis or error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAIAnalysis(sampleRequest, "access-token")).rejects.toThrow(
      "Falha ao conectar com o Nexus AI Core."
    );
  });
});
