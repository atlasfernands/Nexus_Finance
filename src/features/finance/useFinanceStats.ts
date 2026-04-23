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

  const currentPeriodTransactions = transactions.filter(
    (transaction) => transaction.status !== TransactionStatus.CANCELLED
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

  currentPeriodTransactions.forEach((transaction) => {
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

  const saldoRealizado = currentPeriodTransactions
    .filter(
      (transaction) =>
        transaction.status === TransactionStatus.COMPLETED || transaction.status === TransactionStatus.PAID
    )
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

  return {
    selectedPeriod: reportingPeriod,
    currentPeriodLabel,
    previousPeriodLabel,
    saldoRealizado,
    saldoProjetado,
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
    transactions,
    allTransactions,
  };
}
