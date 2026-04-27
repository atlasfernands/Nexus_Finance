/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertCircle, ArrowRight, Bot, BrainCircuit, History, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../features/auth/AuthContext";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { requestAIAnalysis } from "../services/ai";

export default function AIInsights() {
  const { session } = useAuth();
  const { state, dispatch } = useFinance();
  const {
    currentPeriodLabel,
    saldoRealizado,
    saldoProjetado,
    entradasMes,
    saidasMes,
    saldoLoja,
    metaAtingidaPercent,
    transactions,
  } = useFinanceStats();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!session?.access_token) {
        throw new Error("Sessao expirada. Entre novamente para gerar o diagnostico.");
      }

      const response = await requestAIAnalysis(
        {
          transactions: transactions.slice(0, 30).map((transaction) => ({
            date: transaction.date,
            description: transaction.description,
            subcategory: transaction.subcategory,
            type: transaction.type,
            amount: transaction.amount,
          })),
          profile: state.profile,
          metrics: {
            currentPeriodLabel,
            saldoRealizado,
            saldoProjetado,
            entradasMes,
            saidasMes,
            saldoLoja,
            metaAtingidaPercent,
          },
        },
        session.access_token
      );

      dispatch({ type: "ADD_AI_INSIGHT", payload: response.fullAnalysis });
    } catch (caughtError) {
      console.error(caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Falha ao conectar com o Nexus AI Core.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="trading-card border-brand-green/30 bg-gradient-to-br from-brand-card to-brand-green/5">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-green/20 bg-brand-green/10">
            <Bot size={44} className="text-brand-green drop-shadow-[0_0_10px_#00FF9D]" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="mb-2 text-2xl font-bold text-white">Nexus Finance Intelligence</h3>
            <p className="max-w-xl text-sm text-slate-400">
              Nossa IA analisa seu fluxo de caixa, identifica gargalos e sugere estrategias para maximizar seu lucro.
            </p>
          </div>
          <button
            onClick={generateAnalyze}
            disabled={loading}
            className="btn-primary flex w-full items-center justify-center gap-2 px-8 py-4 text-lg disabled:opacity-50 md:w-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit size={24} />}
            {loading ? "Analisando Dados..." : "Gerar Diagnostico"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AnimatePresence mode="wait">
            {state.aiInsights.lastAnalysis ? (
              <motion.div
                key={state.aiInsights.lastAnalysis}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="trading-card min-h-[300px] border-brand-green/30 bg-gradient-to-br from-brand-card to-[#1a2522]"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2 text-brand-green">
                      <Bot size={18} />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Nexus Intelligence</h3>
                    </div>
                    <div className="status-badge flex origin-right scale-75 items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
                      ANALYSIS_READY
                    </div>
                  </div>

                  <div className="flex flex-col gap-8 md:flex-row">
                    <div className="flex h-fit min-w-[140px] flex-col items-center justify-center rounded-xl border border-brand-green/20 bg-brand-bg/50 p-6">
                      <span className="text-5xl font-bold text-brand-green drop-shadow-[0_0_15px_rgba(0,255,157,0.4)]">
                        8.4
                      </span>
                      <span className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Health Score
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed text-slate-300 prose-sm">
                        <ReactMarkdown>{state.aiInsights.lastAnalysis}</ReactMarkdown>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                          #EstrategiaMensal
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                          #GestaoDeFluxo
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                          #NexusInsight
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="trading-card flex flex-col items-center justify-center py-24 italic text-slate-500">
                <Bot size={48} className="mb-4 opacity-10" />
                Nenhum diagnostico gerado recentemente.
              </div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="trading-card">
            <div className="mb-6 flex items-center gap-2">
              <History size={18} className="text-brand-yellow" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Historico de Insights</h4>
            </div>
            <div className="space-y-4">
              {state.aiInsights.history.length === 0 && (
                <p className="text-xs italic text-slate-600">O historico de analises aparecera aqui.</p>
              )}
              {state.aiInsights.history.map((insight, index) => (
                <div
                  key={index}
                  className="cursor-pointer rounded-lg border border-brand-border bg-slate-900/50 p-3 transition-all hover:border-brand-green/30"
                >
                  <p className="mb-1 text-[10px] text-slate-500">{new Date(insight.date).toLocaleString()}</p>
                  <p className="line-clamp-2 text-xs text-slate-300">{insight.content.replace(/[#*]/g, "")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="trading-card border-brand-yellow/20 bg-brand-yellow/5">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-yellow">
              <BrainCircuit size={16} /> Proximos Passos
            </h4>
            <ul className="space-y-3 text-[11px] font-medium text-slate-400">
              <li className="flex gap-2">
                <ArrowRight size={14} className="shrink-0 text-brand-yellow" />
                Mantenha suas contas do modulo Loja sempre conciliadas.
              </li>
              <li className="flex gap-2">
                <ArrowRight size={14} className="shrink-0 text-brand-yellow" />
                Marque como pago os boletos assim que quitados.
              </li>
              <li className="flex gap-2">
                <ArrowRight size={14} className="shrink-0 text-brand-yellow" />
                Importe seu extrato bancario mensalmente via CSV.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
