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
import { parseDateString } from "../../lib/utils";
import {
  calculateRealizedBalanceUntilDate,
  getSignedTransactionImpact,
  normalizeToEndOfDay,
  roundCurrency,
  sortTransactionsByDate,
} from "../../lib/transactionLedger";

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

function getReportingPeriodReferenceDate(period: ReportingPeriod, now = new Date()): Date {
  const isCurrentPeriod =
    period.granularity === "year"
      ? now.getFullYear() === period.year
      : now.getFullYear() === period.year && now.getMonth() === period.month;

  if (isCurrentPeriod) {
    return normalizeToEndOfDay(now);
  }

  if (period.granularity === "year") {
    return normalizeToEndOfDay(new Date(period.year, 11, 31));
  }

  return normalizeToEndOfDay(new Date(period.year, period.month + 1, 0));
}

function isTransactionInReportingPeriod(date: Date, period: ReportingPeriod): boolean {
  if (period.granularity === "year") {
    return date.getFullYear() === period.year;
  }

  return date.getMonth() === period.month && date.getFullYear() === period.year;
}

function getPendingBalanceReferenceDate(dueDate: Date, periodReferenceDate: Date): Date {
  return dueDate.getTime() < periodReferenceDate.getTime() ? periodReferenceDate : dueDate;
}

export function useFinanceStats() {
  const { state } = useFinance();
  const { reportingPeriod, transactions: allTransactions } = state;

  const previousReportingPeriod = getPreviousReportingPeriod(reportingPeriod);
  const reportingReferenceDate = getReportingPeriodReferenceDate(reportingPeriod);
  const previousReportingReferenceDate = getReportingPeriodReferenceDate(previousReportingPeriod);
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
  const realizedPeriodTransactions = currentPeriodTransactions.filter(
    (transaction) => transaction.status === TransactionStatus.PAID
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
  const realizedPreviousPeriodTransactions = previousPeriodTransactions.filter(
    (transaction) => transaction.status === TransactionStatus.PAID
  );

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

  sortTransactionsByDate(realizedPeriodTransactions).forEach((transaction) => {
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

  const pendingBalanceImpact = pendingPeriodTransactions.reduce(
    (sum, transaction) => sum + getSignedTransactionImpact(transaction),
    0
  );
  const pendingTransactionsCount = pendingPeriodTransactions.length;
  const saldoContaRealizado = calculateRealizedBalanceUntilDate(allTransactions, reportingReferenceDate);
  const saldoProjetado = state.preferences.includePendingInBalance
    ? roundCurrency(saldoContaRealizado + pendingBalanceImpact)
    : saldoContaRealizado;

  const entradasMes = realizedPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.INCOME)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const saidasMes = realizedPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const entradasPeriodoAnterior = realizedPreviousPeriodTransactions
    .filter((transaction) => transaction.type === TransactionType.INCOME)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const saidasPeriodoAnterior = realizedPreviousPeriodTransactions
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

  const saldoContaMesAnterior = calculateRealizedBalanceUntilDate(
    allTransactions,
    previousReportingReferenceDate
  );

  const deltaSaldo =
    saldoContaMesAnterior !== 0
      ? ((saldoContaRealizado - saldoContaMesAnterior) / Math.abs(saldoContaMesAnterior)) * 100
      : saldoContaRealizado !== 0
        ? 100
        : 0;

  const monthlyRiskRatio = entradasMes > 0 ? Math.min((saidasMes / entradasMes) * 100, 100) : 100;
  const filledRiskSegments = Math.round(monthlyRiskRatio / 10);
  const riskStatus = monthlyRiskRatio < 60 ? "Baixo" : monthlyRiskRatio < 80 ? "Medio" : "Alto";

  const saldoLoja = currentPeriodTransactions
    .filter(
      (transaction) =>
        transaction.subcategory === TransactionSubcategory.STORE &&
        transaction.status === TransactionStatus.PAID
    )
    .reduce(
      (sum, transaction) =>
        sum + getSignedTransactionImpact(transaction),
      0
    );

  const metaAtingidaPercent =
    state.profile.goal > 0 ? Math.min((saldoLoja / state.profile.goal) * 100, 100) : 0;
  const goalProgressPercent = state.profile.goal > 0 ? (entradasMes / state.profile.goal) * 100 : 0;
  const costSharePercent = entradasMes > 0 ? (saidasMes / entradasMes) * 100 : 0;

  const enrichedCurrentPeriodPending = sortTransactionsByDate(pendingPeriodTransactions).map((transaction) => {
    const parsedDate = parseDateString(transaction.date);
    const balanceReferenceDate = parsedDate
      ? getPendingBalanceReferenceDate(parsedDate, reportingReferenceDate)
      : reportingReferenceDate;
    const balanceBefore = calculateRealizedBalanceUntilDate(allActiveTransactions, balanceReferenceDate);
    const impact = getSignedTransactionImpact(transaction);
    const balanceAfter = roundCurrency(balanceBefore + impact);

    return {
      ...transaction,
      impact,
      balanceBefore,
      balanceAfter,
    };
  });
  const enrichedPendingExpenseTransactions = enrichedCurrentPeriodPending
    .filter((transaction) => transaction.type === TransactionType.EXPENSE)
    .map((transaction) => ({
      ...transaction,
      shortageAmount: roundCurrency(Math.max(transaction.amount - transaction.balanceBefore, 0)),
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
      saldoRealDoDia: number;
      saldoAposDia: number;
      saldoAntesDoDia: number;
      saldoSimuladoAposPendencias: number;
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
        shortageAmount: roundCurrency(Math.max(transaction.amount - transaction.balanceBefore, 0)),
      };
    }

    const currentDay = dailyBalanceMap.get(transaction.date) ?? {
      date: transaction.date,
      entradas: 0,
      saidas: 0,
      saldoAntesDoDia: transaction.balanceBefore,
      saldoAposDia: transaction.balanceBefore,
      saldoRealDoDia: transaction.balanceBefore,
      saldoSimuladoAposPendencias: transaction.balanceBefore,
      transactions: [],
    };

    if (transaction.type === TransactionType.INCOME) {
      currentDay.entradas += transaction.amount;
    } else {
      currentDay.saidas += transaction.amount;
    }

    currentDay.saldoSimuladoAposPendencias = roundCurrency(
      currentDay.saldoSimuladoAposPendencias + transaction.impact
    );
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
    saldoRealizado: saldoContaRealizado,
    saldoProjetado,
    pendingBalanceImpact,
    pendingTransactionsCount,
    entradasMes,
    saidasMes,
    saldoMesAtual: saldoContaRealizado,
    saldoMesAnterior: saldoContaMesAnterior,
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
