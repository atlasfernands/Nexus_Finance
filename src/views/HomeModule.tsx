/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle, Home, Zap } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency } from "../lib/utils";
import { TransactionStatus, TransactionSubcategory, TransactionType } from "../types";

export default function HomeModule() {
  const { dispatch } = useFinance();
  const { currentPeriodLabel, transactions } = useFinanceStats();

  const homeTransactions = transactions.filter(
    (transaction) => transaction.subcategory === TransactionSubcategory.HOME
  );
  const totalSpent = homeTransactions
    .filter(
      (transaction) =>
        transaction.type === TransactionType.EXPENSE &&
        transaction.status !== TransactionStatus.CANCELLED
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categories = Array.from(new Set(homeTransactions.map((transaction) => transaction.category)));
  const categoryData = categories
    .map((category) => ({
      name: category,
      value: homeTransactions
        .filter(
          (transaction) =>
            transaction.category === category && transaction.type === TransactionType.EXPENSE
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter((category) => category.value > 0)
    .sort((left, right) => right.value - left.value);

  const pendingBills = homeTransactions.filter(
    (transaction) =>
      transaction.status === TransactionStatus.PENDING &&
      transaction.type === TransactionType.EXPENSE
  );

  const colors = ["#00FF9D", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#10B981"];

  const markAsPaid = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (transaction) {
      dispatch({
        type: "UPDATE_TRANSACTION",
        payload: { ...transaction, status: TransactionStatus.PAID },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="trading-card flex-1 min-w-0">
          <div className="mb-6 flex items-center gap-2 font-bold text-white">
            <Home className="text-purple-400" /> Custo de Vida Pessoal
          </div>
          <p className="-mt-4 mb-4 text-xs text-slate-500">Periodo ativo: {currentPeriodLabel}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{formatCurrency(totalSpent)}</span>
            <span className="text-xs font-medium uppercase text-slate-500">Gastos Totais (Periodo)</span>
          </div>

          <div className="mt-8 h-64 min-h-[240px] w-full min-w-0 overflow-hidden">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Nenhuma despesa residencial disponivel para o grafico.
              </div>
            )}
          </div>
        </div>

        <div className="trading-card flex w-full flex-col md:w-96">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-white">
            <Zap className="text-brand-yellow" size={18} /> Contas Pendentes
          </h3>
          <div className="max-h-[350px] flex-1 space-y-3 overflow-y-auto pr-2">
            {pendingBills.length === 0 && (
              <div className="py-10 text-center">
                <CheckCircle className="mx-auto mb-2 text-brand-green" />
                <p className="text-sm text-slate-500">Tudo em dia!</p>
              </div>
            )}
            {pendingBills.map((bill) => (
              <div key={bill.id} className="group rounded-lg border border-brand-border bg-slate-900 p-3">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-medium text-white">{bill.description}</span>
                  <span className="text-xs text-brand-red">{formatCurrency(bill.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {bill.date}
                  </span>
                  <button
                    onClick={() => markAsPaid(bill.id)}
                    className="text-[10px] font-bold uppercase tracking-tighter text-brand-green opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                  >
                    Marcar Pago
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-brand-border pt-4 text-center">
            <p className="text-xs text-slate-500">
              Total pendente:{" "}
              <span className="text-brand-yellow">{formatCurrency(pendingBills.reduce((sum, bill) => sum + bill.amount, 0))}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="trading-card">
        <h3 className="mb-6 font-bold text-white">Sugestao de Alocacao</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border-l-4 border-brand-green bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Essencial (50%)</p>
            <p className="text-sm font-medium text-white">Luz, Agua, Aluguel</p>
          </div>
          <div className="rounded-xl border-l-4 border-blue-500 bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Desejos (30%)</p>
            <p className="text-sm font-medium text-white">Lazer, Restaurantes</p>
          </div>
          <div className="rounded-xl border-l-4 border-brand-yellow bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Dividas/Poup. (20%)</p>
            <p className="text-sm font-medium text-white">Investimentos, Reservas</p>
          </div>
          <div className="flex items-center justify-center rounded-xl border border-brand-green/20 bg-brand-green/5 p-4">
            <p className="text-center text-xs font-bold text-brand-green">Analise sua alocacao no modulo IA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
