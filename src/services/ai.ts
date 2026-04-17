import { GoogleGenAI } from "@google/genai";
import { getEnvVar } from "../lib/env";

export interface AIAnalysisRequest {
  transactions: Array<{
    data: string;
    descricao: string;
    subcategoria: string;
    tipo: "entrada" | "saída";
    valor: number;
  }>;
  profile: {
    nome: string;
    loja: string;
    meta: number;
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
      throw new Error("Chave Gemini não configurada. Use VITE_GEMINI_API_KEY no .env.");
    }

    const transactionsContext = request.transactions
      .slice(0, 30)
      .map(t => `- ${t.data}: ${t.descricao} (${t.subcategoria}) [${t.tipo}] R$ ${t.valor}`)
      .join("\n");

    const prompt = `
      Você é um consultor financeiro sênior especializado em MEI (Microempreendedor Individual) e finanças pessoais.
      Analise os seguintes dados financeiros do usuário ${request.profile.nome} (Loja: ${request.profile.loja}):

      MÉTRICAS ATUAIS:
      - Saldo Realizado: R$ ${request.metrics.saldoRealizado}
      - Saldo Projetado: R$ ${request.metrics.saldoProjetado}
      - Entradas no Mês: R$ ${request.metrics.entradasMes}
      - Saídas no Mês: R$ ${request.metrics.saidasMes}
      - Meta da Loja: R$ ${request.profile.meta} (${request.metrics.metaAtingidaPercent.toFixed(1)}% atingido)

      ÚLTIMAS TRANSAÇÕES:
      ${transactionsContext}

      REQUISITOS DA ANÁLISE:
      1. Dê um Score Financeiro de 0 a 10.
      2. Identifique 3 padrões de gastos (ex: lazer alto, custos fixos subindo).
      3. Sugira 2 estratégias acionáveis para atingir a meta da loja.
      4. Alerte sobre riscos (fluxo de caixa negativo, capital de giro baixo).
      5. Formate a resposta em Markdown elegante, usando emojis e seções claras.

      Responda em Português do Brasil com tom profissional e motivador ("Trading Desk Style").
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const fullAnalysis = response.text || "Não foi possível gerar a análise no momento.";

      // Parse the response to extract structured data
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
      throw new Error("Falha ao conectar com o Nexus AI Core. Verifique a configuração da chave API.");
    }
  }

  private extractScore(analysis: string): number {
    const scoreMatch = analysis.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    return scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;
  }

  private extractPatterns(analysis: string): string[] {
    const patterns: string[] = [];
    const lines = analysis.split('\n');
    let inPatternsSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('padrões') || line.toLowerCase().includes('patterns')) {
        inPatternsSection = true;
        continue;
      }
      if (inPatternsSection && (line.startsWith('##') || line.startsWith('###'))) {
        break;
      }
      if (inPatternsSection && line.trim().startsWith('-')) {
        patterns.push(line.trim().substring(1).trim());
      }
    }

    return patterns.slice(0, 3);
  }

  private extractStrategies(analysis: string): string[] {
    const strategies: string[] = [];
    const lines = analysis.split('\n');
    let inStrategiesSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('estratégia') || line.toLowerCase().includes('strategy')) {
        inStrategiesSection = true;
        continue;
      }
      if (inStrategiesSection && (line.startsWith('##') || line.startsWith('###'))) {
        break;
      }
      if (inStrategiesSection && line.trim().startsWith('-')) {
        strategies.push(line.trim().substring(1).trim());
      }
    }

    return strategies.slice(0, 2);
  }

  private extractRisks(analysis: string): string[] {
    const risks: string[] = [];
    const lines = analysis.split('\n');
    let inRisksSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('risco') || line.toLowerCase().includes('risk')) {
        inRisksSection = true;
        continue;
      }
      if (inRisksSection && (line.startsWith('##') || line.startsWith('###'))) {
        break;
      }
      if (inRisksSection && line.trim().startsWith('-')) {
        risks.push(line.trim().substring(1).trim());
      }
    }

    return risks.slice(0, 3);
  }
}

export const aiService = new AIService();
