import { describe, expect, it } from "vitest";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";
import { calculateRunningBalances, sortTransactionsByDate } from "./transactionLedger";

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    date: overrides.date ?? "10/04/2026",
    description: overrides.description ?? "Lancamento",
    category: overrides.category ?? "Outros",
    subcategory: overrides.subcategory ?? TransactionSubcategory.HOME,
    type: overrides.type ?? TransactionType.EXPENSE,
    amount: overrides.amount ?? 100,
    status: overrides.status ?? TransactionStatus.PAID,
    recurring: overrides.recurring ?? false,
    runningBalance: overrides.runningBalance,
    sourceOrder: overrides.sourceOrder,
    notes: overrides.notes,
    tags: overrides.tags,
  };
}

describe("transactionLedger", () => {
  it("orders transactions by date before source order", () => {
    const transactions = [
      createTransaction({ id: "late", date: "10/04/2026", sourceOrder: 1 }),
      createTransaction({ id: "early", date: "01/04/2026", sourceOrder: 99 }),
      createTransaction({ id: "middle", date: "05/04/2026", sourceOrder: 2 }),
    ];

    expect(sortTransactionsByDate(transactions).map((transaction) => transaction.id)).toEqual([
      "early",
      "middle",
      "late",
    ]);
  });

  it("orders received income before expenses on the same day before calculating balance", () => {
    const transactions = [
      createTransaction({
        id: "bill",
        date: "10/04/2026",
        type: TransactionType.EXPENSE,
        amount: 300,
        sourceOrder: 1,
      }),
      createTransaction({
        id: "received",
        date: "10/04/2026",
        type: TransactionType.INCOME,
        amount: 500,
        sourceOrder: 2,
      }),
    ];

    const result = calculateRunningBalances(transactions);

    expect(result.map((transaction) => transaction.id)).toEqual(["received", "bill"]);
    expect(result.map((transaction) => transaction.runningBalance)).toEqual([500, 200]);
  });

  it("calculates running balances for imported rows without accumulated balance", () => {
    const transactions = [
      createTransaction({
        id: "expense",
        date: "03/04/2026",
        type: TransactionType.EXPENSE,
        amount: 250,
      }),
      createTransaction({
        id: "income",
        date: "01/04/2026",
        type: TransactionType.INCOME,
        amount: 1000,
      }),
      createTransaction({
        id: "small-expense",
        date: "05/04/2026",
        type: TransactionType.EXPENSE,
        amount: 49.9,
      }),
    ];

    const result = calculateRunningBalances(transactions);

    expect(result.map((transaction) => transaction.id)).toEqual(["income", "expense", "small-expense"]);
    expect(result.map((transaction) => transaction.runningBalance)).toEqual([1000, 750, 700.1]);
  });

  it("recalculates balances after removed or edited transactions", () => {
    const transactions = [
      createTransaction({
        id: "income",
        date: "01/04/2026",
        type: TransactionType.INCOME,
        amount: 500,
        runningBalance: 9999,
      }),
      createTransaction({
        id: "expense",
        date: "02/04/2026",
        type: TransactionType.EXPENSE,
        amount: 125,
        runningBalance: 9999,
      }),
    ];

    const result = calculateRunningBalances(transactions);

    expect(result.map((transaction) => transaction.runningBalance)).toEqual([500, 375]);
  });

  it("can preserve balances explicitly supplied by an imported file preview", () => {
    const transactions = [
      createTransaction({
        id: "known",
        date: "01/04/2026",
        type: TransactionType.INCOME,
        amount: 100,
        runningBalance: 250,
      }),
      createTransaction({
        id: "missing",
        date: "02/04/2026",
        type: TransactionType.EXPENSE,
        amount: 25,
      }),
    ];

    const result = calculateRunningBalances(transactions, { preserveExisting: true });

    expect(result.map((transaction) => transaction.runningBalance)).toEqual([250, 225]);
  });
});
