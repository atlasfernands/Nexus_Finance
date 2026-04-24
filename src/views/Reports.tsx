/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BarChart3, Download, FileJson, FileSpreadsheet, LineChart as LineIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { parseDateString } from "../lib/utils";
import { TransactionSubcategory, TransactionType } from "../types";

export default function Reports() {
  const { state } = useFinance();
  const { currentPeriodLabel, selectedPeriod, transactions } = useFinanceStats();

  const generateTrendData = () => {
    if (selectedPeriod.granularity === "year") {
      return Array.from({ length: 12 }, (_, month) => {
        const periodDate = new Date(selectedPeriod.year, month, 1);

        const entradas = state.transactions
          .filter((transaction) => {
            const parsedDate = parseDateString(transaction.date);

            return (
              parsedDate &&
              parsedDate.getMonth() === month &&
              parsedDate.getFullYear() === selectedPeriod.year &&
              transaction.type === TransactionType.INCOME
            );
          })
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        const saidas = state.transactions
          .filter((transaction) => {
            const parsedDate = parseDateString(transaction.date);

            return (
              parsedDate &&
              parsedDate.getMonth() === month &&
              parsedDate.getFullYear() === selectedPeriod.year &&
              transaction.type === TransactionType.EXPENSE
            );
          })
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          name: periodDate.toLocaleString("pt-BR", { month: "short" }),
          entradas,
          saidas,
        };
      });
    }

    const referenceDate = new Date(selectedPeriod.year, selectedPeriod.month, 1);

    return Array.from({ length: 6 }, (_, offset) => {
      const periodDate = new Date(referenceDate);
      periodDate.setMonth(referenceDate.getMonth() - (5 - offset));
      const month = periodDate.getMonth();
      const year = periodDate.getFullYear();

      const entradas = state.transactions
        .filter((transaction) => {
          const parsedDate = parseDateString(transaction.date);

          return (
            parsedDate &&
            parsedDate.getMonth() === month &&
            parsedDate.getFullYear() === year &&
            transaction.type === TransactionType.INCOME
          );
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const saidas = state.transactions
        .filter((transaction) => {
          const parsedDate = parseDateString(transaction.date);

          return (
            parsedDate &&
            parsedDate.getMonth() === month &&
            parsedDate.getFullYear() === year &&
            transaction.type === TransactionType.EXPENSE
          );
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        name: periodDate.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
        entradas,
        saidas,
      };
    });
  };

  const trendData = generateTrendData();
  const comparisonData = [
    {
      name: "Casa",
      entradas: transactions
        .filter(
          (transaction) =>
            transaction.subcategory === TransactionSubcategory.HOME &&
            transaction.type === TransactionType.INCOME
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      saidas: transactions
        .filter(
          (transaction) =>
            transaction.subcategory === TransactionSubcategory.HOME &&
            transaction.type === TransactionType.EXPENSE
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    },
    {
      name: "Loja",
      entradas: transactions
        .filter(
          (transaction) =>
            transaction.subcategory === TransactionSubcategory.STORE &&
            transaction.type === TransactionType.INCOME
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      saidas: transactions
        .filter(
          (transaction) =>
            transaction.subcategory === TransactionSubcategory.STORE &&
            transaction.type === TransactionType.EXPENSE
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    },
  ];

  const exportCSV = () => {
    const headers = ["Descricao", "Data", "Valor", "Tipo", "Subcategoria", "Categoria", "Status"];
    const rows = transactions.map((transaction) => [
      transaction.description,
      transaction.date,
      transaction.amount,
      transaction.type,
      transaction.subcategory,
      transaction.category,
      transaction.status,
    ]);
    const csvContent = `data:text/csv;charset=utf-8,${[headers.join(","), ...rows.map((row) => row.join(","))].join("\n")}`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "nexus_transactions.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="trading-card min-w-0">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-white">
            <LineIcon size={18} className="text-brand-green" />
            {selectedPeriod.granularity === "year" ? "Evolucao Mensal do Ano" : "Evolucao ate o Periodo"}
          </h3>
          <p className="-mt-3 mb-5 text-xs text-slate-500">{currentPeriodLabel}</p>
          <div className="h-[300px] min-h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <LineChart data={trendData}>
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
                  contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke="#00FF9D"
                  strokeWidth={3}
                  dot={{ fill: "#00FF9D", strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  stroke="#FF4D4D"
                  strokeWidth={3}
                  dot={{ fill: "#FF4D4D", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="trading-card min-w-0">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-white">
            <BarChart3 size={18} className="text-blue-400" /> Comparativo Casa vs Loja
          </h3>
          <p className="-mt-3 mb-5 text-xs text-slate-500">{currentPeriodLabel}</p>
          <div className="h-[300px] min-h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <BarChart data={comparisonData}>
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
      </div>

      <div className="trading-card">
        <h3 className="mb-6 font-bold text-white">Central de Exportacao</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={exportCSV}
            className="group flex items-center gap-4 rounded-xl border border-brand-border bg-slate-900 p-4 transition-all hover:border-brand-green/50 hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-500 transition-transform group-hover:scale-110">
              <FileSpreadsheet size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Exportar CSV</p>
              <p className="text-[10px] uppercase text-slate-500">Periodo selecionado</p>
            </div>
          </button>

          <button
            onClick={() =>
              alert("Funcao de PDF requer biblioteca externa adicional. Considere usar o print do navegador (Ctrl+P).")
            }
            className="group flex items-center gap-4 rounded-xl border border-brand-border bg-slate-900 p-4 transition-all hover:border-brand-red/50 hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-transform group-hover:scale-110">
              <Download size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Relatorio PDF</p>
              <p className="text-[10px] uppercase text-slate-500">Visao para Impressao</p>
            </div>
          </button>

          <button
            onClick={() => {
              const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(transactions))}`;
              const downloadAnchorNode = document.createElement("a");
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "transactions_backup.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="group flex items-center gap-4 rounded-xl border border-brand-border bg-slate-900 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
              <FileJson size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">JSON Data</p>
              <p className="text-[10px] uppercase text-slate-500">Backup Tecnico</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
