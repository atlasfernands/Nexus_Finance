import { describe, expect, it } from "vitest";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../../types";
import { createInitialState, mergeTransactions, normalizeFinanceState } from "./financeState";

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

describe("financeState", () => {
  it("merges new transactions by date and recalculates accumulated balances", () => {
    const currentTransactions = [
      createTransaction({
        id: "salary",
        date: "05/04/2026",
        type: TransactionType.INCOME,
        amount: 1000,
        runningBalance: 9999,
        sourceOrder: 1,
      }),
    ];
    const nextTransactions = [
      createTransaction({
        id: "rent",
        date: "01/04/2026",
        type: TransactionType.EXPENSE,
        amount: 300,
        sourceOrder: 99,
      }),
      createTransaction({
        id: "market",
        date: "07/04/2026",
        type: TransactionType.EXPENSE,
        amount: 125.5,
      }),
    ];

    const result = mergeTransactions(currentTransactions, nextTransactions);

    expect(result.map((transaction) => transaction.id)).toEqual(["rent", "salary", "market"]);
    expect(result.map((transaction) => transaction.runningBalance)).toEqual([-300, 700, 574.5]);
  });

  it("normalizes saved states with missing balances into ordered ledger rows", () => {
    const state = normalizeFinanceState(
      {
        transactions: [
          {
            id: "late",
            data: "10/04/2026",
            descricao: "Venda",
            categoria: "Vendas",
            tipo: "Entrada",
            valor: 500,
            sourceOrder: 1,
          },
          {
            id: "early",
            data: "01/04/2026",
            descricao: "Conta",
            categoria: "Moradia",
            tipo: "Saida",
            valor: 120,
            sourceOrder: 99,
          },
        ],
      },
      createInitialState()
    );

    expect(state.transactions.map((transaction) => transaction.id)).toEqual(["early", "late"]);
    expect(state.transactions.map((transaction) => transaction.runningBalance)).toEqual([-120, 380]);
  });
});
