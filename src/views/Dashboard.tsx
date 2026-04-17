/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency, cn } from "../lib/utils";
import { motion } from "motion/react";

const KPI_CARD_VARIANTS = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { 
    currentMonthLabel,
    saldoRealizado, 
    saldoProjetado, 
    entradasMes, 
    saidasMes, 
    deltaEntradas, 
    deltaSaidas, 
    monthlyFlow,
    monthlyRiskRatio,
    filledRiskSegments,
    riskStatus,
    metaAtingidaPercent,
    transactions
  } = useFinanceStats();

  const areaData = monthlyFlow;
  const pieData = [
    { name: "Casa", value: transactions.filter(t => t.subcategoria === "Casa").length },
    { name: "Loja", value: transactions.filter(t => t.subcategoria === "Loja").length },
  ];

  const COLORS = ["#00FF9D", "#3B82F6"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={KPI_CARD_VARIANTS} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="trading-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Saldo Realizado</h3>
            <DollarSign className="text-brand-green" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(saldoRealizado)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-brand-green">↑ 12.4% vs fev</span>
          </div>
        </motion.div>

        <motion.div variants={KPI_CARD_VARIANTS} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="trading-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Saldo Projetado</h3>
            <Calendar className="text-blue-500" size={14} />
          </div>
          <p className="kpi-value text-brand-yellow">{formatCurrency(saldoProjetado)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-slate-500 font-mono">INCL. PENDENTES</span>
          </div>
        </motion.div>

        <motion.div variants={KPI_CARD_VARIANTS} initial="initial" animate="animate" transition={{ delay: 0.3 }} className="trading-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Entradas Brutas</h3>
            <TrendingUp className="text-brand-green" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(entradasMes)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-brand-green">↑ {deltaEntradas.toFixed(1)}% vs meta</span>
          </div>
        </motion.div>

        <motion.div variants={KPI_CARD_VARIANTS} initial="initial" animate="animate" transition={{ delay: 0.4 }} className="trading-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Saídas Totais</h3>
            <TrendingDown className="text-brand-red" size={14} />
          </div>
          <p className="kpi-value text-white">{formatCurrency(saidasMes)}</p>
          <div className="mt-4 flex items-center gap-1">
            <span className="text-[10px] font-medium text-brand-red">↓ {deltaSaidas.toFixed(1)}% custos</span>
          </div>
        </motion.div>
      </div>

      {/* Thermometer / Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 trading-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Fluxo de Caixa Mensal</h3>
              <p className="text-xs text-slate-500">{currentMonthLabel}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2 text-brand-green"><span className="w-3 h-1 bg-brand-green rounded-full" /> Entradas</div>
              <div className="flex items-center gap-2 text-brand-red"><span className="w-3 h-1 bg-brand-red rounded-full" /> Saídas</div>
            </div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF9D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00FF9D" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D4D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF4D4D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono" }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#00FF9D" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                <Area type="monotone" dataKey="saidas" stroke="#FF4D4D" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="trading-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Target className="text-brand-green" size={20} />
              <h3 className="text-white font-semibold uppercase text-sm tracking-widest">Meta da Loja</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-mono font-bold text-white">{metaAtingidaPercent.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">R$ {formatCurrency(metaAtingidaPercent * 50)} de R$ 5k</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-brand-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${metaAtingidaPercent}%` }}
                  className="h-full bg-gradient-to-r from-brand-green/40 to-brand-green shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-border">
            <div className={cn(
              "flex items-center gap-2 mb-3",
              riskStatus === "Baixo" ? "text-brand-green" : riskStatus === "Médio" ? "text-yellow-400" : "text-brand-red"
            )}>
              <AlertTriangle size={18} />
              <span className="text-xs font-bold uppercase hidden sm:inline">Termômetro de Risco</span>
              <span className="text-xs font-bold uppercase sm:hidden">Risco</span>
            </div>
            <div className="flex gap-1 h-2">
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = i < filledRiskSegments;
                const activeColor = riskStatus === "Baixo"
                  ? "bg-brand-green"
                  : riskStatus === "Médio"
                    ? "bg-yellow-400"
                    : "bg-brand-red";
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm transition-all",
                      filled ? `${activeColor} shadow-[0_0_10px_rgba(255,255,255,0.08)]` : "bg-slate-800/60"
                    )}
                    style={{ opacity: filled ? 1 : 0.25 }}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 font-medium uppercase tracking-tighter">
              {riskStatus} ({monthlyRiskRatio.toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
