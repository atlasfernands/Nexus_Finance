/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Bot, Sparkles, BrainCircuit, History, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { getEnvVar } from "../lib/env";

export default function AIInsights() {
  const { state, dispatch } = useFinance();
  const { saldoRealizado, saldoProjetado, entradasMes, saidasMes, saldoLoja, metaAtingidaPercent } = useFinanceStats();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = getEnvVar("GEMINI_API_KEY", "") || getEnvVar("VITE_GEMINI_API_KEY", "");
      if (!apiKey) {
        throw new Error("Chave Gemini não configurada. Use VITE_GEMINI_API_KEY no .env.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const transactionsContext = state.transactions.slice(0, 30).map(t => 
        `- ${t.data}: ${t.descricao} (${t.subcategoria}) [${t.tipo}] R$ ${t.valor}`
      ).join("\n");

      const prompt = `
        Você é um consultor financeiro sênior especializado em MEI (Microempreendedor Individual) e finanças pessoais.
        Analise os seguintes dados financeiros do usuário ${state.profile.nome} (Loja: ${state.profile.loja}):
        
        MÉTRICAS ATUAIS:
        - Saldo Realizado: R$ ${saldoRealizado}
        - Saldo Projetado: R$ ${saldoProjetado}
        - Entradas no Mês: R$ ${entradasMes}
        - Saídas no Mês: R$ ${saidasMes}
        - Faturamento da Loja: R$ ${saldoLoja}
        - Meta da Loja: R$ ${state.profile.meta} (${metaAtingidaPercent.toFixed(1)}% atingido)
        
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const text = response.text || "Não foi possível gerar a análise no momento.";
      dispatch({ type: "ADD_AI_INSIGHT", payload: text });
    } catch (err: any) {
      console.error(err);
      setError("Falha ao conectar com o Nexus AI Core. Verifique a configuração da chave API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="trading-card border-brand-green/30 bg-gradient-to-br from-brand-card to-brand-green/5">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-brand-green/10 rounded-2xl flex items-center justify-center border border-brand-green/20">
            <Bot size={44} className="text-brand-green drop-shadow-[0_0_10px_#00FF9D]" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">Nexus Finance Intelligence</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              Nossa IA analisa seu fluxo de caixa, identifica gargalos e sugere estratégias para maximizar seu lucro e atingir suas metas pessoais e do negócio.
            </p>
          </div>
          <button 
            onClick={generateAnalyze}
            disabled={loading}
            className="w-full md:w-auto btn-primary flex items-center justify-center gap-2 px-8 py-4 text-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit size={24} />}
            {loading ? "Analizando Dados..." : "Gerar Diagnóstico"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analysis Area */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {state.aiInsights.lastAnalysis ? (
              <motion.div
                key={state.aiInsights.lastAnalysis}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="trading-card border-brand-green/30 bg-gradient-to-br from-brand-card to-[#1a2522] min-h-[300px]"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2 text-brand-green">
                      <Bot size={18} />
                      <h3 className="font-bold uppercase tracking-wider text-sm">Nexus Intelligence</h3>
                    </div>
                    <div className="status-badge flex items-center gap-2 scale-75 origin-right">
                      <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
                      SONNET_3.5_ANALYSIS
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center justify-center p-6 bg-brand-bg/50 rounded-xl border border-brand-green/20 min-w-[140px] h-fit">
                      <span className="text-5xl font-mono font-bold text-brand-green drop-shadow-[0_0_15px_rgba(0,255,157,0.4)]">
                        8.4
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold mt-2 tracking-widest text-center">Health Score</span>
                    </div>

                    <div className="flex-1">
                      <div className="markdown-body prose prose-invert max-w-none prose-sm text-sm text-slate-300 leading-relaxed">
                        <ReactMarkdown>{state.aiInsights.lastAnalysis}</ReactMarkdown>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-6">
                        <span className="text-[9px] px-2 py-0.5 bg-white/10 text-slate-500 rounded font-bold tracking-tighter uppercase">#EstratégiaMensal</span>
                        <span className="text-[9px] px-2 py-0.5 bg-white/10 text-slate-500 rounded font-bold tracking-tighter uppercase">#GestãoDeFluxo</span>
                        <span className="text-[9px] px-2 py-0.5 bg-white/10 text-slate-500 rounded font-bold tracking-tighter uppercase">#NexusInsight</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="trading-card flex flex-col items-center justify-center py-24 text-slate-500 italic">
                <Bot size={48} className="mb-4 opacity-10" />
                Nenhum diagnóstico gerado recentemente.
              </div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <div className="space-y-6">
          <div className="trading-card">
            <div className="flex items-center gap-2 mb-6">
              <History size={18} className="text-brand-yellow" />
              <h4 className="text-white font-bold uppercase text-xs tracking-widest">Histórico de Insights</h4>
            </div>
            <div className="space-y-4">
              {state.aiInsights.history.length === 0 && (
                <p className="text-xs text-slate-600 italic">O histórico de análises aparecerá aqui.</p>
              )}
              {state.aiInsights.history.map((insight, idx) => (
                <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-brand-border hover:border-brand-green/30 transition-all cursor-pointer">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">{new Date(insight.date).toLocaleString()}</p>
                  <p className="text-xs text-slate-300 line-clamp-2">{insight.content.replace(/[#*]/g, '')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="trading-card bg-brand-yellow/5 border-brand-yellow/20">
            <h4 className="text-brand-yellow font-bold text-sm mb-2 flex items-center gap-2">
              <BrainCircuit size={16} /> Próximos Passos
            </h4>
            <ul className="space-y-3 text-[11px] text-slate-400 font-medium">
              <li className="flex gap-2">
                <ArrowRight size={14} className="text-brand-yellow shrink-0" />
                Mantenha suas contas do Módulo Loja sempre conciliadas.
              </li>
              <li className="flex gap-2">
                <ArrowRight size={14} className="text-brand-yellow shrink-0" />
                Marque como 'pago' os boletos assim que quitados.
              </li>
              <li className="flex gap-2">
                <ArrowRight size={14} className="text-brand-yellow shrink-0" />
                Importe seu extrato bancário mensalmente via CSV.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
