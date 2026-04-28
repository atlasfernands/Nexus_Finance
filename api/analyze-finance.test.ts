import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIAnalysisRequest } from "../src/services/ai";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  GoogleGenAI: vi.fn(),
  interactionsCreate: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: mocks.GoogleGenAI,
}));

import handler from "./analyze-finance";

const samplePayload: AIAnalysisRequest = {
  transactions: [
    {
      date: "2026-04-27",
      description: "Aluguel",
      subcategory: "Moradia",
      type: "Saida",
      amount: 1200,
    },
    {
      date: "2026-04-28",
      description: "Venda Pix",
      subcategory: "Loja",
      type: "Entrada",
      amount: 2500,
    },
  ],
  profile: {
    name: "Ana",
    store: "Atelie Nexus",
    goal: 5000,
  },
  metrics: {
    currentPeriodLabel: "Abril 2026",
    saldoRealizado: 1800,
    saldoProjetado: 950,
    entradasMes: 7000,
    saidasMes: 6050,
    saldoLoja: 4200,
    metaAtingidaPercent: 84,
  },
};

async function invokeHandler(options: {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
} = {}) {
  const server = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/analyze-finance`, {
      method: options.method ?? "POST",
      headers: options.headers,
      body: options.body,
    });
    const text = await response.text();

    return {
      json: text ? JSON.parse(text) : null,
      status: response.status,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

describe("analyze-finance API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NODE_ENV = "development";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    mocks.createClient.mockReturnValue({
      auth: {
        getUser: mocks.getUser,
      },
    });
    mocks.interactionsCreate.mockResolvedValue({
      outputs: [
        {
          type: "text",
          text: "Analise gerada pelo Gemini",
        },
      ],
    });
    mocks.GoogleGenAI.mockImplementation(function GoogleGenAI() {
      return {
        interactions: {
          create: mocks.interactionsCreate,
        },
      };
    });
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NODE_ENV = "test";
  });

  it("returns 405 for methods other than POST", async () => {
    const response = await invokeHandler({ method: "GET" });

    expect(response.status).toBe(405);
    expect(response.json).toEqual({ error: "Metodo nao permitido." });
  });

  it("requires an authenticated session token", async () => {
    const response = await invokeHandler({
      body: JSON.stringify(samplePayload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(401);
    expect(response.json).toEqual({ error: "Sessao obrigatoria para gerar diagnostico." });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase rejects the session", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error("bad token"),
    });

    const response = await invokeHandler({
      body: JSON.stringify(samplePayload),
      headers: {
        Authorization: "Bearer token-invalido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(401);
    expect(response.json).toEqual({ error: "Sessao invalida." });
  });

  it("returns local fallback analysis in development when Gemini is not configured", async () => {
    const response = await invokeHandler({
      body: JSON.stringify(samplePayload),
      headers: {
        Authorization: "Bearer token-valido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json.fullAnalysis).toContain("## Diagnostico Local");
    expect(response.json.fullAnalysis).toContain("Score Financeiro");
    expect(mocks.GoogleGenAI).not.toHaveBeenCalled();
  });

  it("returns 503 in production when Gemini is not configured", async () => {
    process.env.NODE_ENV = "production";

    const response = await invokeHandler({
      body: JSON.stringify(samplePayload),
      headers: {
        Authorization: "Bearer token-valido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(503);
    expect(response.json).toEqual({ error: "Nexus AI Core nao esta configurado no servidor." });
  });

  it("uses Gemini with the configured model when an API key exists", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.GEMINI_MODEL = "gemini-3-flash-preview";

    const response = await invokeHandler({
      body: JSON.stringify(samplePayload),
      headers: {
        Authorization: "Bearer token-valido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ fullAnalysis: "Analise gerada pelo Gemini" });
    expect(mocks.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "gemini-key" });
    expect(mocks.interactionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3-flash-preview",
        input: expect.any(String),
      })
    );
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const response = await invokeHandler({
      body: "{",
      headers: {
        Authorization: "Bearer token-valido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "JSON invalido." });
  });
});
