import { Transaction, TransactionStatus, TransactionType } from "../types";
import { compareDateStrings } from "./utils";

interface CalculateRunningBalanceOptions {
  preserveExisting?: boolean;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTransactionImpact(transaction: Transaction) {
  if (transaction.status === TransactionStatus.CANCELLED) {
    return 0;
  }

  return transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
}

export function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    const dateComparison = compareDateStrings(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
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

    if (options.preserveExisting && existingBalance !== undefined) {
      runningBalance = existingBalance;
      return transaction;
    }

    runningBalance = roundCurrency(runningBalance + getTransactionImpact(transaction));

    return {
      ...transaction,
      runningBalance,
    };
  });
}
