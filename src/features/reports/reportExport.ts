import { FinanceState, Transaction, TransactionStatus, TransactionType } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { ComparisonDataItem, ReportUpcomingPayment } from "./reportData";

interface ReportNegativePendingEvent {
  balanceAfter: number;
  balanceBefore: number;
  date: string;
  transaction: Transaction;
}

interface ReportHtmlInput {
  comparisonData: ComparisonDataItem[];
  currentPeriodLabel: string;
  entradasMes: number;
  firstNegativePendingEvent?: ReportNegativePendingEvent;
  generatedAt: string;
  profile: FinanceState["profile"];
  riskStatus: string;
  saidasMes: number;
  saldoProjetado: number;
  saldoRealizado: number;
  transactions: Transaction[];
  upcomingPayments: ReportUpcomingPayment[];
}

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

function renderUpcomingPaymentRows(upcomingPayments: ReportUpcomingPayment[]) {
  if (upcomingPayments.length === 0) {
    return `<tr><td colspan="5" class="empty">Nenhuma conta pendente encontrada no periodo selecionado.</td></tr>`;
  }

  return upcomingPayments
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
    .join("");
}

function renderComparisonRows(comparisonData: ComparisonDataItem[]) {
  return comparisonData
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
}

function renderNegativeAlert(firstNegativePendingEvent?: ReportNegativePendingEvent) {
  if (!firstNegativePendingEvent) {
    return `
      <div class="alert success">
        Nenhuma conta pendente do periodo leva o saldo para baixo de zero.
      </div>
    `;
  }

  return `
    <div class="alert danger">
      <strong>Primeiro momento critico:</strong> ${escapeHtml(firstNegativePendingEvent.date)}<br />
      <span>${escapeHtml(firstNegativePendingEvent.transaction.description)} (${escapeHtml(
        firstNegativePendingEvent.transaction.category
      )})</span><br />
      <span>Saldo na vespera: ${escapeHtml(formatCurrency(firstNegativePendingEvent.balanceBefore))}</span><br />
      <span>Saldo depois: ${escapeHtml(formatCurrency(firstNegativePendingEvent.balanceAfter))}</span>
    </div>
  `;
}

export function buildReportHtml(input: ReportHtmlInput) {
  const transactionsRowsHtml =
    input.transactions.length > 0
      ? renderTransactionTableRows(input.transactions)
      : `<tr><td colspan="7" class="empty">Nenhum lancamento encontrado no periodo selecionado.</td></tr>`;

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio Nexus Finance - ${escapeHtml(input.currentPeriodLabel)}</title>
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
              <p class="subtitle">Periodo: ${escapeHtml(input.currentPeriodLabel)}</p>
            </div>
            <div class="meta">
              <div>Gerado em ${escapeHtml(input.generatedAt)}</div>
              <div>${escapeHtml(input.profile.name)}${input.profile.store ? ` - ${escapeHtml(input.profile.store)}` : ""}</div>
            </div>
          </div>

          <div class="summary">
            <div class="card">
              <div class="card-label">Saldo realizado</div>
              <div class="card-value">${escapeHtml(formatCurrency(input.saldoRealizado))}</div>
            </div>
            <div class="card">
              <div class="card-label">Saldo projetado</div>
              <div class="card-value">${escapeHtml(formatCurrency(input.saldoProjetado))}</div>
            </div>
            <div class="card">
              <div class="card-label">Entradas</div>
              <div class="card-value">${escapeHtml(formatCurrency(input.entradasMes))}</div>
            </div>
            <div class="card">
              <div class="card-label">Saidas</div>
              <div class="card-value">${escapeHtml(formatCurrency(input.saidasMes))}</div>
            </div>
          </div>

          <div class="section">
            <h2>Radar Financeiro</h2>
            <p class="subtitle" style="margin-bottom: 10px;">Risco atual: ${escapeHtml(input.riskStatus)}</p>
            ${renderNegativeAlert(input.firstNegativePendingEvent)}
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
                  ${renderComparisonRows(input.comparisonData)}
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
                  ${renderUpcomingPaymentRows(input.upcomingPayments)}
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
}

export function downloadTransactionsCsv(transactions: Transaction[]) {
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
}

export function downloadTransactionsJson(transactions: Transaction[]) {
  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(transactions))}`;
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "transactions_backup.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function printReportHtml(html: string): boolean {
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
    return false;
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

  return true;
}
