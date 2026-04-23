/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Package, Store, Target, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency } from "../lib/utils";
import { TransactionStatus, TransactionSubcategory, TransactionType } from "../types";

export default function StoreModule() {
  const { state } = useFinance();
  const { currentPeriodLabel, transactions } = useFinanceStats();

  const storeTransactions = transactions.filter(
    (transaction) => transaction.subcategory === TransactionSubcategory.STORE
  );
  const sales = storeTransactions
    .filter(
      (transaction) =>
        transaction.type === TransactionType.INCOME &&
        (transaction.status === TransactionStatus.PAID ||
          transaction.status === TransactionStatus.COMPLETED)
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const costs = storeTransactions
    .filter(
      (transaction) =>
        transaction.type === TransactionType.EXPENSE &&
        (transaction.status === TransactionStatus.PAID ||
          transaction.status === TransactionStatus.COMPLETED)
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const marginRaw = sales - costs;
  const marginPercent = sales > 0 ? (marginRaw / sales) * 100 : 0;
  const goalProgress = state.profile.goal > 0 ? Math.min((sales / state.profile.goal) * 100, 100) : 0;

  const chartData = [
    { name: "Vendas", value: sales, color: "#00FF9D" },
    { name: "Custos", value: costs, color: "#FF4D4D" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-brand-green/20 bg-brand-green/10 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-brand-green p-3 text-black">
            <Store size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{state.profile.store}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-green">Painel de Controle MEI</p>
            <p className="mt-1 text-xs text-slate-400">Periodo ativo: {currentPeriodLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Margem de Lucro</p>
          <p className="text-3xl font-bold text-brand-green">{marginPercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="trading-card">
          <TrendingUp className="mb-4 text-brand-green" />
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Vendas Totais</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(sales)}</p>
        </div>
        <div className="trading-card">
          <Package className="mb-4 text-blue-400" />
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Custos Operacionais</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(costs)}</p>
        </div>
        <div className="trading-card">
          <Target className="mb-4 text-brand-yellow" />
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Lucro Liquido</p>
          <p className="text-2xl font-bold text-brand-green">{formatCurrency(marginRaw)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="trading-card min-w-0">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-white">Desempenho Comercial</h3>
          <div className="h-[280px] min-h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="trading-card">
          <h3 className="mb-4 font-bold text-white">Meta do Periodo</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-brand-border bg-slate-900 p-4">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Realizado</p>
                <p className="text-xl text-white">{formatCurrency(sales)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-slate-500">Objetivo</p>
                <p className="text-xl text-brand-green">{formatCurrency(state.profile.goal)}</p>
              </div>
            </div>

            <div className="relative pt-8">
              <div className="h-4 overflow-hidden rounded-full border border-brand-border bg-slate-900">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  className="h-full bg-brand-green shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all"
                />
              </div>
              <div
                style={{ left: `${goalProgress}%` }}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              >
                <div className="rounded bg-brand-green px-2 py-0.5 text-[10px] font-bold text-black shadow-lg">
                  VOCE
                </div>
                <div className="h-4 w-0.5 bg-brand-green" />
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Faltam <span className="text-white">{formatCurrency(Math.max(state.profile.goal - sales, 0))}</span>{" "}
              para atingir o objetivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
