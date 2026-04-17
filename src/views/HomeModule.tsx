/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Home, Coffee, ShoppingCart, Car, Zap, CheckCircle } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency, cn } from "../lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function HomeModule() {
  const { state, dispatch } = useFinance();
  const { transactions } = useFinanceStats();

  const homeTransactions = transactions.filter(t => t.subcategoria === "Casa");
  const totalSpent = homeTransactions.filter(t => t.tipo === "saída" && t.status !== "cancelado").reduce((acc, t) => acc + t.valor, 0);

  const categories = Array.from(new Set(homeTransactions.map(t => t.categoria)));
  const categoryData = categories.map(cat => ({
    name: cat,
    value: homeTransactions.filter(t => t.categoria === cat && t.tipo === "saída").reduce((acc, t) => acc + t.valor, 0)
  })).filter(c => c.value > 0).sort((a,b) => b.value - a.value);

  const pendingBills = homeTransactions.filter(t => t.status === "pendente" && t.tipo === "saída");

  const COLORS = ["#00FF9D", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#10B981"];

  const markAsPaid = (id: string) => {
    const t = transactions.find(x => x.id === id);
    if (t) {
      dispatch({ type: "UPDATE_TRANSACTION", payload: { ...t, status: "pago" } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 trading-card">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <Home className="text-purple-400" /> Custo de Vida Pessoal
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">{formatCurrency(totalSpent)}</span>
            <span className="text-xs text-slate-500 uppercase font-medium">Gastos Totais (Mes)</span>
          </div>

          <div className="mt-8 h-64 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="w-full md:w-96 trading-card flex flex-col">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <Zap className="text-brand-yellow" size={18} /> Contas Pendentes
          </h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] pr-2">
            {pendingBills.length === 0 && (
              <div className="text-center py-10">
                <CheckCircle className="mx-auto text-brand-green mb-2" />
                <p className="text-sm text-slate-500">Tudo em dia!</p>
              </div>
            )}
            {pendingBills.map((bill) => (
              <div key={bill.id} className="bg-slate-900 border border-brand-border p-3 rounded-lg group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-white">{bill.descricao}</span>
                  <span className="text-xs font-mono text-brand-red">{formatCurrency(bill.valor)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{bill.data}</span>
                  <button 
                    onClick={() => markAsPaid(bill.id)}
                    className="text-[10px] font-bold text-brand-green uppercase tracking-tighter hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Marcar Pago
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-brand-border text-center">
            <p className="text-xs text-slate-500">Total pendente: <span className="text-brand-yellow font-mono">{formatCurrency(pendingBills.reduce((acc, b) => acc+b.valor, 0))}</span></p>
          </div>
        </div>
      </div>

      <div className="trading-card">
         <h3 className="text-white font-bold mb-6">Sugestão de Alocação</h3>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 rounded-xl border-l-4 border-brand-green">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Essencial (50%)</p>
               <p className="text-sm font-medium text-white">Luz, Água, Aluguel</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border-l-4 border-blue-500">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Desejos (30%)</p>
               <p className="text-sm font-medium text-white">Lazer, Restaurantes</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border-l-4 border-brand-yellow">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Dívidas/Poup. (20%)</p>
               <p className="text-sm font-medium text-white">Investimentos, Reservas</p>
            </div>
            <div className="p-4 bg-brand-green/5 rounded-xl border border-brand-green/20 flex items-center justify-center">
               <p className="text-xs text-brand-green font-bold text-center">Analise sua alocação no módulo IA</p>
            </div>
         </div>
      </div>
    </div>
  );
}
