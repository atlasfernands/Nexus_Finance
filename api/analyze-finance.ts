import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AIAnalysisRequest, AIAnalysisResponse } from "../src/services/ai";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_TRANSACTIONS = 30;
const MAX_TEXT_LENGTH = 120;

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

function getBearerToken(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function readRequestBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload muito grande."));
        request.destroy();
        return;
      }

      body += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    request.on("error", reject);
  });
}

function sanitizeText(value: unknown, fallback = ""): string {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function sanitizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeAnalysisRequest(payload: unknown): AIAnalysisRequest {
  const data = (payload ?? {}) as Partial<AIAnalysisRequest>;
  const profile = (data.profile ?? {}) as Partial<AIAnalysisRequest["profile"]>;
  const metrics = (data.metrics ?? {}) as Partial<AIAnalysisRequest["metrics"]>;
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];

  return {
    transactions: transactions.slice(0, MAX_TRANSACTIONS).map((transaction) => ({
      date: sanitizeText(transaction?.date),
      description: sanitizeText(transaction?.description),
      subcategory: sanitizeText(transaction?.subcategory),
      type: sanitizeText(transaction?.type),
      amount: Math.abs(sanitizeNumber(transaction?.amount)),
    })),
    profile: {
      name: sanitizeText(profile.name, "Usuario"),
      store: sanitizeText(profile.store, "Minha Loja"),
      goal: sanitizeNumber(profile.goal),
    },
    metrics: {
      currentPeriodLabel: sanitizeText(metrics.currentPeriodLabel),
      saldoRealizado: sanitizeNumber(metrics.saldoRealizado),
      saldoProjetado: sanitizeNumber(metrics.saldoProjetado),
      entradasMes: sanitizeNumber(metrics.entradasMes),
      saidasMes: sanitizeNumber(metrics.saidasMes),
      saldoLoja: sanitizeNumber(metrics.saldoLoja),
      metaAtingidaPercent: sanitizeNumber(metrics.metaAtingidaPercent),
    },
  };
}

function buildPrompt(request: AIAnalysisRequest): string {
  const transactionsContext = request.transactions
    .map(
      (transaction) =>
        `- ${transaction.date}: ${transaction.description} (${transaction.subcategory}) [${transaction.type}] R$ ${transaction.amount}`
    )
    .join("\n");

  return `
    Voce e um consultor financeiro senior especializado em MEI e financas pessoais.
    Analise os seguintes dados financeiros do usuario ${request.profile.name} (Loja: ${request.profile.store}):
    PERIODO EM ANALISE: ${request.metrics.currentPeriodLabel}

    METRICAS ATUAIS:
    - Saldo Realizado: R$ ${request.metrics.saldoRealizado}
    - Saldo Projetado: R$ ${request.metrics.saldoProjetado}
    - Entradas no Mes: R$ ${request.metrics.entradasMes}
    - Saidas no Mes: R$ ${request.metrics.saidasMes}
    - Faturamento da Loja: R$ ${request.metrics.saldoLoja}
    - Meta da Loja: R$ ${request.profile.goal} (${request.metrics.metaAtingidaPercent.toFixed(1)}% atingido)

    ULTIMAS TRANSACOES:
    ${transactionsContext || "Nenhuma transacao recente enviada."}

    REQUISITOS DA ANALISE:
    1. De um Score Financeiro de 0 a 10.
    2. Identifique 3 padroes de gastos.
    3. Sugira 2 estrategias acionaveis para atingir a meta da loja.
    4. Alerte sobre riscos relevantes.
    5. Formate a resposta em Markdown com secoes claras.

    Responda em Portugues do Brasil com tom profissional e motivador.
  `;
}

async function verifySupabaseUser(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase nao configurado no servidor.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Sessao invalida.");
  }
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Metodo nao permitido." });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    sendJson(response, 503, { error: "Nexus AI Core nao esta configurado no servidor." });
    return;
  }

  const token = getBearerToken(request);
  if (!token) {
    sendJson(response, 401, { error: "Sessao obrigatoria para gerar diagnostico." });
    return;
  }

  try {
    await verifySupabaseUser(token);
    const payload = await readRequestBody(request);
    const analysisRequest = sanitizeAnalysisRequest(payload);
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: buildPrompt(analysisRequest),
    });

    const fullAnalysis = aiResponse.text || "Nao foi possivel gerar a analise no momento.";
    const body: AIAnalysisResponse = { fullAnalysis };

    sendJson(response, 200, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar diagnostico.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
