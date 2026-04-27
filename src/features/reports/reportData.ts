import { ReportingPeriod, Transaction, TransactionSubcategory, TransactionType } from "../../types";
import { parseDateString } from "../../lib/utils";

export interface ComparisonDataItem {
  entradas: number;
  name: string;
  saidas: number;
}

export type ReportUpcomingPayment = Transaction & {
  balanceBefore: number;
  daysUntil: number | null;
  shortageAmount: number;
};

export function buildTrendData(allTransactions: Transaction[], selectedPeriod: ReportingPeriod) {
  if (selectedPeriod.granularity === "year") {
    return Array.from({ length: 12 }, (_, month) => {
      const periodDate = new Date(selectedPeriod.year, month, 1);

      const entradas = allTransactions
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

      const saidas = allTransactions
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

    const entradas = allTransactions
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

    const saidas = allTransactions
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
}

export function buildComparisonData(transactions: Transaction[]): ComparisonDataItem[] {
  return [
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
}

export function buildUpcomingPayments(
  upcomingPendingExpenses: Array<Transaction & { balanceBefore: number; shortageAmount: number }>
): ReportUpcomingPayment[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return upcomingPendingExpenses.map((transaction) => {
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
}
