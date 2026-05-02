import { Transaction, TransactionStatus, TransactionType } from "../types";
import { compareDateStrings, parseDateString } from "./utils";

interface CalculateRunningBalanceOptions {
  preserveExisting?: boolean;
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getSignedTransactionImpact(transaction: Transaction) {
  return transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
}

export function getRealizedTransactionImpact(transaction: Transaction) {
  if (transaction.status !== TransactionStatus.PAID) {
    return 0;
  }

  return getSignedTransactionImpact(transaction);
}

function getStatusSortRank(status: TransactionStatus) {
  if (status === TransactionStatus.PAID) {
    return 0;
  }

  if (status === TransactionStatus.PENDING) {
    return 1;
  }

  return 2;
}

export function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    const dateComparison = compareDateStrings(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    const statusComparison = getStatusSortRank(left.status) - getStatusSortRank(right.status);
    if (statusComparison !== 0) {
      return statusComparison;
    }

    if (left.type !== right.type) {
      return left.type === TransactionType.INCOME ? -1 : 1;
    }

    if (typeof left.sourceOrder === "number" && typeof right.sourceOrder === "number") {
      return left.sourceOrder - right.sourceOrder;
    }

    return left.description.localeCompare(right.description, "pt-BR");
  });
}

export function normalizeToEndOfDay(date: Date): Date {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(23, 59, 59, 999);
  return normalizedDate;
}

export function calculateRealizedBalanceUntilDate(transactions: Transaction[], referenceDate: Date): number {
  const referenceEndOfDay = normalizeToEndOfDay(referenceDate);

  return roundCurrency(
    sortTransactionsByDate(transactions).reduce((sum, transaction) => {
      const parsedDate = parseDateString(transaction.date);

      if (!parsedDate || parsedDate.getTime() > referenceEndOfDay.getTime()) {
        return sum;
      }

      return sum + getRealizedTransactionImpact(transaction);
    }, 0)
  );
}

export function calculateRunningBalances(
  transactions: Transaction[],
  options: CalculateRunningBalanceOptions = {}
): Transaction[] {
  let runningBalance = 0;

  return sortTransactionsByDate(transactions).map((transaction) => {
    const existingBalance =
      typeof transaction.runningBalance === "number" && Number.isFinite(transaction.runningBalance)
        ? transaction.runningBalance
        : undefined;

    if (
      options.preserveExisting &&
      existingBalance !== undefined &&
      transaction.status === TransactionStatus.PAID
    ) {
      runningBalance = existingBalance;
      return transaction;
    }

    runningBalance = roundCurrency(runningBalance + getRealizedTransactionImpact(transaction));

    return {
      ...transaction,
      runningBalance,
    };
  });
}
