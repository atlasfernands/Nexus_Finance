/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useFinance } from "./FinanceContext";
import {
  ReportingPeriod,
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../../types";
import { compareDateStrings, parseDateString } from "../../lib/utils";

function sortTransactionsByDate(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => {
    const dateComparison = compareDateStrings(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    if (left.type !== right.type) {
      return left.type === TransactionType.INCOME ? -1 : 1;
    }

    return left.description.localeCompare(right.description, "pt-BR");
  });
}

function formatReportingPeriodLabel(period: ReportingPeriod): string {
  if (period.granularity === "year") {
    return String(period.year);
  }

  return new Date(period.year, period.month, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function getPreviousReportingPeriod(period: ReportingPeriod): ReportingPeriod {
  if (period.granularity === "year") {
    return {
      ...period,
      year: period.year - 1,
    };
  }

  const previousDate = new Date(period.year, period.month - 1, 1);

  return {
    ...period,
    month: previousDate.getMonth(),
    year: previousDate.getFullYear(),
  };
}

function isTransactionInReportingPeriod(date: Date, period: ReportingPeriod): boolean {
  if (period.granularity === "year") {
    return date.getFullYear() === period.year;
  }

  return date.getMonth() === period.month && date.getFullYear() === period.year;
}

export function useFinanceStats() {
  const { state } = useFinance();
  const { reportingPeriod, transactions: allTransactions } = state;

  const previousReportingPeriod = getPreviousReportingPeriod(reportingPeriod);
  const currentPeriodLabel = formatReportingPeriodLabel(reportingPeriod);
  const previousPeriodLabel = formatReportingPeriodLabel(previousReportingPeriod);

  const transactions = allTransactions.filter((transaction) => {
    const parsedDate = parseDateString(transaction.date);
    return parsedDate ? isTransactionInReportingPeriod(parsedDate, reportingPeriod) : false;
  });
  const allActiveTransactions = sortTransactionsByDate(
    allTransactions.filter((transaction) => transaction.status !== TransactionStatus.CANCELLED)
  );

  const currentPeriodTransactions = transactions.filter(
    (transaction) => transaction.status !== TransactionStatus.CANCELLED
  );
  const sortedCurrentPeriodTransactions = sortTransactionsByDate(currentPeriodTransactions);
  const realizedPeriodTransactions = currentPeriodTransactions.filter(
    (transaction) =>
      transaction.status === TransactionStatus.COMPLETED || transaction.status === TransactionStatus.PAID
  );
  const pendingPeriodTransactions = currentPeriodTransactions.filter(
    (transaction) => transaction.status === TransactionStatus.PENDING
  );
  const previousPeriodTransactions = allTransactions.filter((transaction) => {
    const parsedDate = parseDateString(transaction.date);

    return (
      parsedDate &&
      isTransactionInReportingPeriod(parsedDate, previousReportingPeriod) &&
      transaction.status !== TransactionStatus.CANCELLED
    );
  });

  const flowData =
    reportingPeriod.granularity === "year"
      ? Array.from({ length: 12 }, (_, month) => ({
          name: new Date(reportingPeriod.year, month, 1).toLocaleString("pt-BR", { month: "short" }),
          entradas: 0,
          saidas: 0,
        }))
      : Array.from({ length: 5 }, (_, index) => ({
          name: `Sem ${index + 1}`,
          entradas: 0,
          saidas: 0,
        }));

  sortedCurrentPeriodTransactions.forEach((transaction) => {
    const parsedDate = parseDateString(transaction.date);
    if (!parsedDate) {
      return;
    }

    const bucketIndex =
      reportingPeriod.granularity === "year"
        ? parsedDate.getMonth()
        : Math.min(4, Math.floor((parsedDate.getDate() - 1) / 7));

    if (transaction.type === TransactionType.INCOME) {
      flowData[bucketIndex].entradas += transaction.amount;
    } else {
      flowData[bucketIndex].saidas += transaction.amount;
    }
  });

  const saldoRealizado = realizedPeriodTransactions
    .reduce(
      (sum, transaction) =>
        sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
      0
    );

  const saldoProjetado = currentPeriodTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
    0
  );
  const pendingBalanceImpact = pendingPeriodTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
    0
  );
  const pendingTransactionsCount = pendingPeriodTransactions.length;

  const entradasMes = currentPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.INCOME)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const saidasMes = currentPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const entradasPeriodoAnterior = previousPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.INCOME)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const saidasPeriodoAnterior = previousPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const deltaEntradas =
    entradasPeriodoAnterior !== 0
      ? ((entradasMes - entradasPeriodoAnterior) / entradasPeriodoAnterior) * 100
      : 0;
  const deltaSaidas =
    saidasPeriodoAnterior !== 0
      ? ((saidasMes - saidasPeriodoAnterior) / saidasPeriodoAnterior) * 100
      : 0;

  const saldoMesAtual = currentPeriodTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
    0
  );
  const saldoMesAnterior = previousPeriodTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
    0
  );

  const deltaSaldo =
    saldoMesAnterior !== 0
      ? ((saldoMesAtual - saldoMesAnterior) / Math.abs(saldoMesAnterior)) * 100
      : saldoMesAtual !== 0
        ? 100
        : 0;

  const monthlyRiskRatio = entradasMes > 0 ? Math.min((saidasMes / entradasMes) * 100, 100) : 100;
  const filledRiskSegments = Math.round(monthlyRiskRatio / 10);
  const riskStatus = monthlyRiskRatio < 60 ? "Baixo" : monthlyRiskRatio < 80 ? "Medio" : "Alto";

  const saldoLoja = currentPeriodTransactions
    .filter(
      (transaction) =>
        transaction.subcategory === TransactionSubcategory.STORE &&
        (transaction.status === TransactionStatus.COMPLETED ||
          transaction.status === TransactionStatus.PAID)
    )
    .reduce(
      (sum, transaction) =>
        sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount),
      0
    );

  const metaAtingidaPercent =
    state.profile.goal > 0 ? Math.min((saldoLoja / state.profile.goal) * 100, 100) : 0;
  const goalProgressPercent = state.profile.goal > 0 ? (entradasMes / state.profile.goal) * 100 : 0;
  const costSharePercent = entradasMes > 0 ? (saidasMes / entradasMes) * 100 : 0;

  const ledgerTimeline = allActiveTransactions.map((transaction) => {
    const impact = transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
    return {
      transaction,
      impact,
    };
  });

  let runningLedgerBalance = 0;
  const enrichedLedgerTimeline = ledgerTimeline.map(({ transaction, impact }) => {
    const balanceBefore = runningLedgerBalance;
    runningLedgerBalance += impact;
    const balanceAfter = runningLedgerBalance;

    return {
      ...transaction,
      impact,
      balanceBefore,
      balanceAfter,
    };
  });

  const enrichedCurrentPeriodPending = enrichedLedgerTimeline.filter(
    (transaction) =>
      transaction.status === TransactionStatus.PENDING &&
      isTransactionInReportingPeriod(parseDateString(transaction.date) ?? new Date(Number.NaN), reportingPeriod)
  );
  const enrichedPendingExpenseTransactions = enrichedCurrentPeriodPending
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .map((transaction) => ({
      ...transaction,
      shortageAmount: Math.max(transaction.amount - transaction.balanceBefore, 0),
    }));

  let firstNegativePendingEvent:
    | {
        balanceAfter: number;
        balanceBefore: number;
        date: string;
        shortageAmount: number;
        transaction: Transaction;
      }
    | undefined;

  const dailyBalanceMap = new Map<
    string,
    {
      date: string;
      entradas: number;
      saidas: number;
      saldoAposDia: number;
      saldoAntesDoDia: number;
      transactions: Array<
        Transaction & {
          impact: number;
          balanceAfter: number;
          balanceBefore: number;
        }
      >;
    }
  >();

  enrichedCurrentPeriodPending.forEach((transaction) => {
    if (!firstNegativePendingEvent && transaction.type === TransactionType.EXPENSE && transaction.balanceAfter < 0) {
      firstNegativePendingEvent = {
        date: transaction.date,
        transaction,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
        shortageAmount: Math.max(transaction.amount - transaction.balanceBefore, 0),
      };
    }

    const currentDay = dailyBalanceMap.get(transaction.date) ?? {
      date: transaction.date,
      entradas: 0,
      saidas: 0,
      saldoAntesDoDia: transaction.balanceBefore,
      saldoAposDia: transaction.balanceAfter,
      transactions: [],
    };

    if (transaction.type === TransactionType.INCOME) {
      currentDay.entradas += transaction.amount;
    } else {
      currentDay.saidas += transaction.amount;
    }

    currentDay.saldoAposDia = transaction.balanceAfter;
    currentDay.transactions.push({
      ...transaction,
    });

    dailyBalanceMap.set(transaction.date, currentDay);
  });

  const dailyBalanceTimeline = Array.from(dailyBalanceMap.values()).map((day) => {
    const negativeTrigger = day.transactions.find((transaction) => transaction.balanceAfter < 0);

    return {
      ...day,
      negativeTrigger,
    };
  });

  return {
    selectedPeriod: reportingPeriod,
    currentPeriodLabel,
    previousPeriodLabel,
    saldoRealizado,
    saldoProjetado,
    pendingBalanceImpact,
    pendingTransactionsCount,
    entradasMes,
    saidasMes,
    saldoMesAtual,
    saldoMesAnterior,
    deltaEntradas,
    deltaSaidas,
    deltaSaldo,
    monthlyFlow: flowData,
    monthlyRiskRatio,
    filledRiskSegments,
    riskStatus,
    saldoLoja,
    metaAtingidaPercent,
    goalProgressPercent,
    costSharePercent,
    firstNegativePendingEvent,
    dailyBalanceTimeline,
    upcomingPendingExpenses: enrichedPendingExpenseTransactions,
    transactions,
    allTransactions,
  };
}
