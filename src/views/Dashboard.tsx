/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertTriangle, Calendar, DollarSign, Target, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { cn, formatCurrency } from "../lib/utils";

const KPI_CARD_VARIANTS = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const {
    currentPeriodLabel,
    previousPeriodLabel,
    saldoRealizado,
    saldoProjetado,
    entradasMes,
    saidasMes,
    saldoMesAtual,
    saldoMesAnterior,
    deltaEntradas,
    deltaSaidas,
    deltaSaldo,
    monthlyFlow,
    monthlyRiskRatio,
    filledRiskSegments,
    riskStatus,
    metaAtingidaPercent,
  } = useFinanceStats();
  const { state } = useFinance();

  const goalValue = state.profile.goal;
  const goalAmountReached = (metaAtingidaPercent * goalValue) / 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={KPI_CARD_VARIANTS}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
          className="trading-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo Realizado</h3>
            <DollarSign className="text-brand-green" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(saldoRealizado)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span
              className={cn(
                "text-[10px] font-medium",
                deltaSaldo >= 0 ? "text-brand-green" : "text-brand-red"
              )}
            >
              {saldoMesAnterior === 0 && saldoMesAtual === 0
                ? "Sem dados para comparacao"
                : saldoMesAnterior === 0
                  ? "Novo periodo"
                  : `${deltaSaldo >= 0 ? "↑" : "↓"} ${Math.abs(deltaSaldo).toFixed(1)}% vs ${previousPeriodLabel}`}
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={KPI_CARD_VARIANTS}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="trading-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo Projetado</h3>
            <Calendar className="text-blue-500" size={14} />
          </div>
          <p className="kpi-value text-brand-yellow">{formatCurrency(saldoProjetado)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="font-mono text-[10px] font-medium text-slate-500">INCL. PENDENTES</span>
          </div>
        </motion.div>

        <motion.div
          variants={KPI_CARD_VARIANTS}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
          className="trading-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entradas Brutas</h3>
            <TrendingUp className="text-brand-green" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(entradasMes)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-brand-green">↑ {deltaEntradas.toFixed(1)}% vs meta</span>
          </div>
        </motion.div>

        <motion.div
          variants={KPI_CARD_VARIANTS}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.4 }}
          className="trading-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saidas Totais</h3>
            <TrendingDown className="text-brand-red" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(saidasMes)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-brand-red">↓ {deltaSaidas.toFixed(1)}% custos</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="trading-card min-w-0 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Fluxo de Caixa do Periodo</h3>
              <p className="text-xs text-slate-500">{currentPeriodLabel}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2 text-brand-green">
                <span className="h-1 w-3 rounded-full bg-brand-green" /> Entradas
              </div>
              <div className="flex items-center gap-2 text-brand-red">
                <span className="h-1 w-3 rounded-full bg-brand-red" /> Saidas
              </div>
            </div>
          </div>

          <div className="h-48 min-h-[220px] w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <AreaChart data={monthlyFlow}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF9D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FF9D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D4D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF4D4D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono" }}
                />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  stroke="#00FF9D"
                  fillOpacity={1}
                  fill="url(#colorEntradas)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  stroke="#FF4D4D"
                  fillOpacity={1}
                  fill="url(#colorSaidas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="trading-card flex flex-col justify-between">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <Target className="text-brand-green" size={20} />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white">Meta da Loja</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{metaAtingidaPercent.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">
                  {formatCurrency(goalAmountReached)} de {formatCurrency(goalValue)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-brand-border bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metaAtingidaPercent}%` }}
                  className="h-full bg-gradient-to-r from-brand-green/40 to-brand-green shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-brand-border pt-6">
            <div
              className={cn(
                "mb-3 flex items-center gap-2",
                riskStatus === "Baixo"
                  ? "text-brand-green"
                  : riskStatus === "Medio"
                    ? "text-yellow-400"
                    : "text-brand-red"
              )}
            >
              <AlertTriangle size={18} />
              <span className="hidden text-xs font-bold uppercase sm:inline">Termometro de Risco</span>
              <span className="text-xs font-bold uppercase sm:hidden">Risco</span>
            </div>
            <div className="flex h-2 gap-1">
              {Array.from({ length: 10 }).map((_, index) => {
                const filled = index < filledRiskSegments;
                const activeColor =
                  riskStatus === "Baixo"
                    ? "bg-brand-green"
                    : riskStatus === "Medio"
                      ? "bg-yellow-400"
                      : "bg-brand-red";

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 rounded-sm transition-all",
                      filled ? `${activeColor} shadow-[0_0_10px_rgba(255,255,255,0.08)]` : "bg-slate-800/60"
                    )}
                    style={{ opacity: filled ? 1 : 0.25 }}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-tighter text-slate-500">
              {riskStatus} ({monthlyRiskRatio.toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
