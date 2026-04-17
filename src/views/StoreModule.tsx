/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Store, TrendingUp, Package, Percent, Target, Plus, ArrowUpRight } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency } from "../lib/utils";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function StoreModule() {
  const { state } = useFinance();
  const { transactions } = useFinanceStats();

  const storeTransactions = transactions.filter(t => t.subcategoria === "Loja");
  const sales = storeTransactions.filter(t => t.tipo === "entrada" && (t.status === "pago" || t.status === "realizado")).reduce((acc, t) => acc + t.valor, 0);
  const costs = storeTransactions.filter(t => t.tipo === "saída" && (t.status === "pago" || t.status === "realizado")).reduce((acc, t) => acc + t.valor, 0);
  const marginRaw = sales - costs;
  const marginPercent = sales > 0 ? (marginRaw / sales) * 100 : 0;

  const chartData = [
    { name: "Vendas", value: sales, color: "#00FF9D" },
    { name: "Custos", value: costs, color: "#FF4D4D" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-brand-green/10 p-6 rounded-2xl border border-brand-green/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-green text-black rounded-xl">
            <Store size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{state.profile.loja}</h2>
            <p className="text-brand-green text-xs font-bold uppercase tracking-widest">Painel de Controle MEI</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Margem de Lucro</p>
          <p className="text-3xl font-mono font-bold text-brand-green">{marginPercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="trading-card">
          <TrendingUp className="text-brand-green mb-4" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Vendas Totais</p>
          <p className="text-2xl font-mono font-bold text-white">{formatCurrency(sales)}</p>
        </div>
        <div className="trading-card">
          <Package className="text-blue-400 mb-4" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Custos Operacionais</p>
          <p className="text-2xl font-mono font-bold text-white">{formatCurrency(costs)}</p>
        </div>
        <div className="trading-card">
          <Target className="text-brand-yellow mb-4" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Lucro Líquido</p>
          <p className="text-2xl font-mono font-bold text-brand-green">{formatCurrency(marginRaw)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="trading-card h-[350px]">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">Desempenho Comercial</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
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

        <div className="trading-card">
          <h3 className="text-white font-bold mb-4">Meta Mensal</h3>
          <div className="space-y-6">
            <div className="bg-slate-900 p-4 rounded-xl border border-brand-border flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Realizado</p>
                <p className="text-xl font-mono text-white">{formatCurrency(sales)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Objetivo</p>
                <p className="text-xl font-mono text-brand-green">{formatCurrency(state.profile.meta)}</p>
              </div>
            </div>
            
            <div className="relative pt-8">
               <div className="h-4 bg-slate-900 rounded-full border border-brand-border overflow-hidden">
                 <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((sales/state.profile.meta)*100, 100)}%` }}
                  className="h-full bg-brand-green shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all"
                 />
               </div>
               <div 
                 style={{ left: `${Math.min((sales/state.profile.meta)*100, 100)}%` }}
                 className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
               >
                 <div className="bg-brand-green text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">VOCÊ</div>
                 <div className="w-0.5 h-4 bg-brand-green" />
               </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Faltam <span className="text-white font-mono">{formatCurrency(Math.max(state.profile.meta - sales, 0))}</span> para atingir o objetivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
