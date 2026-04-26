/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  FileJson,
  FileSpreadsheet,
  LineChart as LineIcon,
} from "lucide-react";
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
import { cn, formatCurrency, parseDateString } from "../lib/utils";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTransactionTypeLabel(type: TransactionType) {
  return type === TransactionType.INCOME ? "Entrada" : "Saida";
}

function formatTransactionStatusLabel(status: TransactionStatus) {
  if (status === TransactionStatus.PAID) {
    return "Pago";
  }

  if (status === TransactionStatus.PENDING) {
    return "Pendente";
  }

  if (status === TransactionStatus.CANCELLED) {
    return "Cancelado";
  }

  return "Realizado";
}

function formatSignedCurrency(amount: number, type: TransactionType) {
  return type === TransactionType.EXPENSE ? `(${formatCurrency(amount)})` : formatCurrency(amount);
}

function formatBalanceValue(balance?: number) {
  if (typeof balance !== "number") {
    return "-";
  }

  return balance < 0 ? `(${formatCurrency(Math.abs(balance))})` : formatCurrency(balance);
}

function renderTransactionTableRows(items: Transaction[]) {
  return items
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td>${escapeHtml(transaction.category)}</td>
          <td>${escapeHtml(formatTransactionTypeLabel(transaction.type))}</td>
          <td class="value">${escapeHtml(formatSignedCurrency(transaction.amount, transaction.type))}</td>
          <td>${escapeHtml(formatTransactionStatusLabel(transaction.status))}</td>
          <td class="value">${escapeHtml(formatBalanceValue(transaction.runningBalance))}</td>
        </tr>
      `
    )
    .join("");
}

export default function Reports() {
  const { state } = useFinance();
  const {
    currentPeriodLabel,
    selectedPeriod,
    transactions,
    saldoRealizado,
    saldoProjetado,
    entradasMes,
    saidasMes,
    riskStatus,
    firstNegativePendingEvent,
    dailyBalanceTimeline,
    upcomingPendingExpenses,
  } =
    useFinanceStats();

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

  const negativeReasonLabel = firstNegativePendingEvent
    ? `${firstNegativePendingEvent.transaction.description} (${firstNegativePendingEvent.transaction.category})`
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingPayments = upcomingPendingExpenses.map((transaction) => {
    const parsedDate = parseDateString(transaction.date);
    const dueDate = parsedDate ? new Date(parsedDate) : null;

    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
    }

    const daysUntil = dueDate
      ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...transaction,
      daysUntil,
    };
  });

  const exportPDF = () => {
    const generatedAt = new Date().toLocaleString("pt-BR");
    const transactionsRowsHtml =
      transactions.length > 0
        ? renderTransactionTableRows(transactions)
        : `<tr><td colspan="7" class="empty">Nenhum lancamento encontrado no periodo selecionado.</td></tr>`;

    const upcomingPaymentsRowsHtml =
      upcomingPayments.length > 0
        ? upcomingPayments
            .map((transaction) => {
              const deadlineLabel =
                transaction.daysUntil === null
                  ? "Data invalida"
                  : transaction.daysUntil < 0
                    ? `${Math.abs(transaction.daysUntil)} dia(s) atrasada`
                    : transaction.daysUntil === 0
                      ? "Vence hoje"
                      : `${transaction.daysUntil} dia(s) restante(s)`;

              return `
                <tr>
                  <td>${escapeHtml(transaction.date)}</td>
                  <td>${escapeHtml(deadlineLabel)}</td>
                  <td>${escapeHtml(transaction.description)}</td>
                  <td>${escapeHtml(transaction.category)}</td>
                  <td class="value">${escapeHtml(formatCurrency(transaction.amount))}</td>
                </tr>
              `;
            })
            .join("")
        : `<tr><td colspan="5" class="empty">Nenhuma conta pendente encontrada no periodo selecionado.</td></tr>`;

    const comparisonRowsHtml = comparisonData
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="value">${escapeHtml(formatCurrency(item.entradas))}</td>
            <td class="value">${escapeHtml(formatCurrency(item.saidas))}</td>
          </tr>
        `
      )
      .join("");

    const negativeAlertHtml = firstNegativePendingEvent
      ? `
        <div class="alert danger">
          <strong>Primeiro momento critico:</strong> ${escapeHtml(firstNegativePendingEvent.date)}<br />
          <span>${escapeHtml(firstNegativePendingEvent.transaction.description)} (${escapeHtml(
            firstNegativePendingEvent.transaction.category
          )})</span><br />
          <span>Saldo na vespera: ${escapeHtml(formatCurrency(firstNegativePendingEvent.balanceBefore))}</span><br />
          <span>Saldo depois: ${escapeHtml(formatCurrency(firstNegativePendingEvent.balanceAfter))}</span>
        </div>
      `
      : `
        <div class="alert success">
          Nenhuma conta pendente do periodo leva o saldo para baixo de zero.
        </div>
      `;

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatorio Nexus Finance - ${escapeHtml(currentPeriodLabel)}</title>
          <style>
            :root {
              color-scheme: light;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .page {
              padding: 32px;
            }
            h1, h2, h3, p {
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 28px;
              font-weight: 700;
            }
            .subtitle {
              margin-top: 8px;
              color: #4b5563;
              font-size: 14px;
            }
            .meta {
              text-align: right;
              color: #6b7280;
              font-size: 12px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 20px;
            }
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 14px;
              background: #f9fafb;
            }
            .card-label {
              color: #6b7280;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .card-value {
              margin-top: 6px;
              font-size: 18px;
              font-weight: 700;
            }
            .section {
              margin-top: 24px;
            }
            .section h2 {
              font-size: 18px;
              margin-bottom: 12px;
            }
            .alert {
              padding: 14px 16px;
              border-radius: 12px;
              font-size: 14px;
              line-height: 1.5;
            }
            .alert.success {
              background: #ecfdf5;
              border: 1px solid #10b981;
              color: #065f46;
            }
            .alert.danger {
              background: #fef2f2;
              border: 1px solid #ef4444;
              color: #991b1b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f4f6;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #374151;
            }
            td.value {
              text-align: right;
              white-space: nowrap;
              font-variant-numeric: tabular-nums;
            }
            td.empty {
              text-align: center;
              color: #6b7280;
              font-style: italic;
            }
            .grid-two {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 18px;
            }
            @media print {
              .page {
                padding: 18px;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <h1 class="title">Relatorio Nexus Finance</h1>
                <p class="subtitle">Periodo: ${escapeHtml(currentPeriodLabel)}</p>
              </div>
              <div class="meta">
                <div>Gerado em ${escapeHtml(generatedAt)}</div>
                <div>${escapeHtml(state.profile.name)}${state.profile.store ? ` • ${escapeHtml(state.profile.store)}` : ""}</div>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <div class="card-label">Saldo realizado</div>
                <div class="card-value">${escapeHtml(formatCurrency(saldoRealizado))}</div>
              </div>
              <div class="card">
                <div class="card-label">Saldo projetado</div>
                <div class="card-value">${escapeHtml(formatCurrency(saldoProjetado))}</div>
              </div>
              <div class="card">
                <div class="card-label">Entradas</div>
                <div class="card-value">${escapeHtml(formatCurrency(entradasMes))}</div>
              </div>
              <div class="card">
                <div class="card-label">Saidas</div>
                <div class="card-value">${escapeHtml(formatCurrency(saidasMes))}</div>
              </div>
            </div>

            <div class="section">
              <h2>Radar Financeiro</h2>
              <p class="subtitle" style="margin-bottom: 10px;">Risco atual: ${escapeHtml(riskStatus)}</p>
              ${negativeAlertHtml}
            </div>

            <div class="section grid-two">
              <div>
                <h2>Comparativo Casa vs Loja</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Entradas</th>
                      <th>Saidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${comparisonRowsHtml}
                  </tbody>
                </table>
              </div>

              <div>
                <h2>Pagamentos Pendentes</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Prazo</th>
                      <th>Conta</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${upcomingPaymentsRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section">
              <h2>Lancamentos do Periodo</h2>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descricao</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactionsRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("aria-hidden", "true");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";

    document.body.appendChild(printFrame);

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    };

    const frameWindow = printFrame.contentWindow;
    const frameDocument = printFrame.contentDocument ?? frameWindow?.document;

    if (!frameWindow || !frameDocument) {
      cleanup();
      alert("Nao foi possivel preparar a impressao agora.");
      return;
    }

    frameWindow.onafterprint = cleanup;

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(cleanup, 60000);
    }, 250);
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        <div className="trading-card">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
            <AlertTriangle size={18} className="text-brand-yellow" />
            Radar do Vermelho
          </h3>
          <p className="-mt-2 mb-5 text-xs text-slate-500">{currentPeriodLabel}</p>

          {firstNegativePendingEvent ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-red">Primeiro momento critico</p>
                <p className="mt-2 text-lg font-bold text-white">{firstNegativePendingEvent.date}</p>
                <p className="mt-1 text-sm text-slate-300">{negativeReasonLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-brand-border bg-slate-900 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Saldo na vespera</p>
                  <p className="mt-1 font-mono font-bold text-white">
                    {formatCurrency(firstNegativePendingEvent.balanceBefore)}
                  </p>
                </div>
                <div className="rounded-xl border border-brand-border bg-slate-900 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Falta para pagar</p>
                  <p className="mt-1 font-mono font-bold text-brand-red">
                    {formatCurrency(firstNegativePendingEvent.shortageAmount)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-brand-border bg-slate-900 p-4">
                <p className="text-[10px] uppercase text-slate-500">Conta que vira o caixa</p>
                <p className="mt-2 text-sm text-white">{firstNegativePendingEvent.transaction.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {firstNegativePendingEvent.transaction.subcategory} • {firstNegativePendingEvent.transaction.category}
                </p>
                <p className="mt-3 font-mono text-sm text-brand-red">
                  {firstNegativePendingEvent.transaction.type === TransactionType.EXPENSE ? "-" : "+"}
                  {" "}
                  {formatCurrency(firstNegativePendingEvent.transaction.amount)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Apos esse pagamento, o saldo projetado fica em {formatCurrency(firstNegativePendingEvent.balanceAfter)}.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Caixa protegido</p>
              <p className="mt-2 text-sm text-slate-200">
                Nenhuma conta pendente do periodo leva o saldo para baixo de zero.
              </p>
            </div>
          )}
        </div>

        <div className="trading-card min-w-0">
          <h3 className="mb-4 font-bold text-white">Linha do Tempo por Dia</h3>
          <p className="-mt-2 mb-5 text-xs text-slate-500">
            Datas sempre aparecem em ordem cronologica, mesmo se o CSV vier fora de sequencia.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-brand-border text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 text-right">Entradas</th>
                  <th className="px-3 py-2 text-right">Saidas</th>
                  <th className="px-3 py-2 text-right">Saldo apos dia</th>
                  <th className="px-3 py-2">Motivo principal</th>
                  <th className="px-3 py-2 text-right">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {dailyBalanceTimeline.map((day) => {
                  const reasonTransaction = day.negativeTrigger ?? day.transactions[day.transactions.length - 1];

                  return (
                    <tr
                      key={day.date}
                      className={cn(
                        "transition-colors hover:bg-slate-800/30",
                        day.negativeTrigger && "bg-brand-red/5"
                      )}
                    >
                      <td className="px-3 py-3 font-mono text-slate-300">{day.date}</td>
                      <td className="px-3 py-3 text-right font-mono text-brand-green">
                        {formatCurrency(day.entradas)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-white">
                        {formatCurrency(day.saidas)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right font-mono font-bold",
                          day.saldoAposDia < 0 ? "text-brand-red" : "text-white"
                        )}
                      >
                        {formatCurrency(day.saldoAposDia)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{reasonTransaction.description}</span>
                          <span className="text-[10px] uppercase text-slate-500">
                            {reasonTransaction.subcategory} • {reasonTransaction.category}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right font-mono font-bold",
                          reasonTransaction.impact >= 0 ? "text-brand-green" : "text-brand-red"
                        )}
                      >
                        {reasonTransaction.impact >= 0 ? "+" : "-"} {formatCurrency(Math.abs(reasonTransaction.impact))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {dailyBalanceTimeline.length === 0 && (
              <div className="py-12 text-center italic text-slate-500">
                Nenhum lancamento encontrado no periodo para montar a linha do tempo diaria.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="trading-card min-w-0">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
          <Calendar size={18} className="text-blue-400" />
          Calendario de Pagamentos
        </h3>
        <p className="-mt-2 mb-5 text-xs text-slate-500">
          Proximas contas pendentes em ordem de vencimento. Lancamentos pagos nao entram aqui.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-brand-border text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status do prazo</th>
                <th className="px-3 py-2">Conta</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2 text-right">Saldo na vespera</th>
                <th className="px-3 py-2 text-right">Falta</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {upcomingPayments.map((transaction) => {
                const deadlineLabel =
                  transaction.daysUntil === null
                    ? "Data invalida"
                    : transaction.daysUntil < 0
                      ? `${Math.abs(transaction.daysUntil)} dia(s) atrasada`
                      : transaction.daysUntil === 0
                        ? "Vence hoje"
                        : `${transaction.daysUntil} dia(s) restante(s)`;

                const deadlineTone =
                  transaction.daysUntil === null
                    ? "text-slate-500"
                    : transaction.daysUntil < 0
                      ? "text-brand-red"
                      : transaction.daysUntil === 0
                        ? "text-brand-yellow"
                        : "text-slate-300";

                return (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-800/30">
                    <td className="px-3 py-3 font-mono text-slate-300">{transaction.date}</td>
                    <td className={cn("px-3 py-3 font-medium", deadlineTone)}>{deadlineLabel}</td>
                    <td className="px-3 py-3 text-white">{transaction.description}</td>
                    <td className="px-3 py-3 text-slate-400">
                      {transaction.subcategory} • {transaction.category}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-white">
                      {formatCurrency(transaction.balanceBefore)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right font-mono font-bold",
                        transaction.shortageAmount > 0 ? "text-brand-red" : "text-brand-green"
                      )}
                    >
                      {transaction.shortageAmount > 0 ? formatCurrency(transaction.shortageAmount) : "Coberto"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {upcomingPayments.length === 0 && (
            <div className="py-12 text-center italic text-slate-500">
              Nenhuma conta pendente encontrada no periodo selecionado.
            </div>
          )}
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
            onClick={exportPDF}
            className="group flex items-center gap-4 rounded-xl border border-brand-border bg-slate-900 p-4 transition-all hover:border-brand-red/50 hover:bg-slate-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-transform group-hover:scale-110">
              <Download size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Relatorio PDF</p>
              <p className="text-[10px] uppercase text-slate-500">Abrir para salvar em PDF</p>
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
