import { GoogleGenAI } from "@google/genai";
import { getEnvVar } from "../lib/env";
import { TransactionSubcategory, TransactionType } from "../types";

export interface AIAnalysisRequest {
  transactions: Array<{
    date: string;
    description: string;
    subcategory: TransactionSubcategory;
    type: TransactionType;
    amount: number;
  }>;
  profile: {
    name: string;
    store: string;
    goal: number;
  };
  metrics: {
    saldoRealizado: number;
    saldoProjetado: number;
    entradasMes: number;
    saidasMes: number;
    metaAtingidaPercent: number;
  };
}

export interface AIAnalysisResponse {
  score: number;
  patterns: string[];
  strategies: string[];
  risks: string[];
  fullAnalysis: string;
}

export class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    const apiKey = getEnvVar("GEMINI_API_KEY", "") || getEnvVar("VITE_GEMINI_API_KEY", "");
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async analyzeFinance(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.ai) {
      throw new Error("Chave Gemini nao configurada. Use VITE_GEMINI_API_KEY no .env.");
    }

    const transactionsContext = request.transactions
      .slice(0, 30)
      .map(
        (transaction) =>
          `- ${transaction.date}: ${transaction.description} (${transaction.subcategory}) [${transaction.type}] R$ ${transaction.amount}`
      )
      .join("\n");

    const prompt = `
      Voce e um consultor financeiro senior especializado em MEI e financas pessoais.
      Analise os seguintes dados financeiros do usuario ${request.profile.name} (Loja: ${request.profile.store}):

      METRICAS ATUAIS:
      - Saldo Realizado: R$ ${request.metrics.saldoRealizado}
      - Saldo Projetado: R$ ${request.metrics.saldoProjetado}
      - Entradas no Mes: R$ ${request.metrics.entradasMes}
      - Saidas no Mes: R$ ${request.metrics.saidasMes}
      - Meta da Loja: R$ ${request.profile.goal} (${request.metrics.metaAtingidaPercent.toFixed(1)}% atingido)

      ULTIMAS TRANSACOES:
      ${transactionsContext}

      REQUISITOS DA ANALISE:
      1. De um Score Financeiro de 0 a 10.
      2. Identifique 3 padroes de gastos.
      3. Sugira 2 estrategias acionaveis para atingir a meta da loja.
      4. Alerte sobre riscos relevantes.
      5. Formate a resposta em Markdown elegante e objetiva.

      Responda em Portugues do Brasil com tom profissional e motivador.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const fullAnalysis = response.text || "Nao foi possivel gerar a analise no momento.";
      const score = this.extractScore(fullAnalysis);
      const patterns = this.extractPatterns(fullAnalysis);
      const strategies = this.extractStrategies(fullAnalysis);
      const risks = this.extractRisks(fullAnalysis);

      return {
        score,
        patterns,
        strategies,
        risks,
        fullAnalysis,
      };
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw new Error("Falha ao conectar com o Nexus AI Core. Verifique a configuracao da chave API.");
    }
  }

  private extractScore(analysis: string): number {
    const scoreMatch = analysis.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    return scoreMatch ? parseFloat(scoreMatch[1]) : 5;
  }

  private extractPatterns(analysis: string): string[] {
    const patterns: string[] = [];
    const lines = analysis.split("\n");
    let inPatternsSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes("padroes") || line.toLowerCase().includes("patterns")) {
        inPatternsSection = true;
        continue;
      }
      if (inPatternsSection && (line.startsWith("##") || line.startsWith("###"))) {
        break;
      }
      if (inPatternsSection && line.trim().startsWith("-")) {
        patterns.push(line.trim().substring(1).trim());
      }
    }

    return patterns.slice(0, 3);
  }

  private extractStrategies(analysis: string): string[] {
    const strategies: string[] = [];
    const lines = analysis.split("\n");
    let inStrategiesSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes("estrategia") || line.toLowerCase().includes("strategy")) {
        inStrategiesSection = true;
        continue;
      }
      if (inStrategiesSection && (line.startsWith("##") || line.startsWith("###"))) {
        break;
      }
      if (inStrategiesSection && line.trim().startsWith("-")) {
        strategies.push(line.trim().substring(1).trim());
      }
    }

    return strategies.slice(0, 2);
  }

  private extractRisks(analysis: string): string[] {
    const risks: string[] = [];
    const lines = analysis.split("\n");
    let inRisksSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes("risco") || line.toLowerCase().includes("risk")) {
        inRisksSection = true;
        continue;
      }
      if (inRisksSection && (line.startsWith("##") || line.startsWith("###"))) {
        break;
      }
      if (inRisksSection && line.trim().startsWith("-")) {
        risks.push(line.trim().substring(1).trim());
      }
    }

    return risks.slice(0, 3);
  }
}

export const aiService = new AIService();
