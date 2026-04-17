/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BarChart3, LineChart as LineIcon, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency, formatDate } from "../lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export default function Reports() {
  const { state } = useFinance();
  const { transactions } = useFinanceStats();

  const generateMonthlyData = () => {
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - offset));
      return `${date.toLocaleString("pt-BR", { month: "short" })}`;
    });

    return months.map((label, idx) => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - (5 - idx));
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();

      const entradas = state.transactions
        .filter(t => {
          const d = formatDate(t.data);
          return d.getMonth() === month && d.getFullYear() === year && t.tipo === "entrada";
        })
        .reduce((acc, t) => acc + t.valor, 0);

      const saidas = state.transactions
        .filter(t => {
          const d = formatDate(t.data);
          return d.getMonth() === month && d.getFullYear() === year && t.tipo === "saída";
        })
        .reduce((acc, t) => acc + t.valor, 0);

      return { name: label, entradas, saidas };
    });
  };

  const monthlyData = generateMonthlyData();

  const exportCSV = () => {
    const headers = ["Descrição", "Data", "Valor", "Tipo", "Subcategoria", "Categoria", "Status"];
    const rows = state.transactions.map(t => [
      t.descricao, t.data, t.valor, t.tipo, t.subcategoria, t.categoria, t.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "nexus_transactions.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="trading-card h-[400px]">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2"><LineIcon size={18} className="text-brand-green" /> Evolução de Saldo</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="entradas" stroke="#00FF9D" strokeWidth={3} dot={{ fill: '#00FF9D', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="saidas" stroke="#FF4D4D" strokeWidth={3} dot={{ fill: '#FF4D4D', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="trading-card h-[400px]">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-400" /> Comparativo Casa vs Loja</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={[
              { name: "Casa", entradas: transactions.filter(t => t.subcategoria === "Casa" && t.tipo === "entrada").reduce((acc, t) => acc + t.valor, 0), 
                      saidas: transactions.filter(t => t.subcategoria === "Casa" && t.tipo === "saída").reduce((acc, t) => acc + t.valor, 0) },
              { name: "Loja", entradas: transactions.filter(t => t.subcategoria === "Loja" && t.tipo === "entrada").reduce((acc, t) => acc + t.valor, 0), 
                      saidas: transactions.filter(t => t.subcategoria === "Loja" && t.tipo === "saída").reduce((acc, t) => acc + t.valor, 0) }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22252B" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
              />
              <Bar dataKey="entradas" fill="#00FF9D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#FF4D4D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="trading-card">
        <h3 className="text-white font-bold mb-6">Central de Exportação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={exportCSV} className="p-4 bg-slate-900 border border-brand-border rounded-xl flex items-center gap-4 hover:bg-slate-800 transition-all hover:border-brand-green/50 group">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Exportar CSV</p>
              <p className="text-[10px] text-slate-500 uppercase">Para Excel / Planilhas</p>
            </div>
          </button>

          <button onClick={() => alert("Função de PDF requer biblioteca externa adicional. Considere usar o print do navegador (Ctrl+P).")} className="p-4 bg-slate-900 border border-brand-border rounded-xl flex items-center gap-4 hover:bg-slate-800 transition-all hover:border-brand-red/50 group">
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Relatório PDF</p>
              <p className="text-[10px] text-slate-500 uppercase">Visão para Impressão</p>
            </div>
          </button>

          <button onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.transactions));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", "transactions_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }} className="p-4 bg-slate-900 border border-brand-border rounded-xl flex items-center gap-4 hover:bg-slate-800 transition-all hover:border-blue-500/50 group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <FileJson size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">JSON Data</p>
              <p className="text-[10px] text-slate-500 uppercase">Backup Técnico</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
