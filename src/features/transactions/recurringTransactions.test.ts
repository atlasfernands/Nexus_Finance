import { describe, expect, it } from "vitest";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../../types";
import { expandRecurringTransactions, RECURRING_MONTHS_AHEAD } from "./recurringTransactions";

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? "tx-base",
    date: overrides.date ?? "31/01/2026",
    description: overrides.description ?? "Aluguel",
    category: overrides.category ?? "Moradia",
    subcategory: overrides.subcategory ?? TransactionSubcategory.HOME,
    type: overrides.type ?? TransactionType.EXPENSE,
    amount: overrides.amount ?? 1500,
    status: overrides.status ?? TransactionStatus.PENDING,
    recurring: overrides.recurring ?? true,
    runningBalance: overrides.runningBalance,
    sourceOrder: overrides.sourceOrder,
    notes: overrides.notes,
    tags: overrides.tags,
  };
}

describe("recurringTransactions", () => {
  it("keeps non-recurring launches as a single occurrence", () => {
    const transaction = createTransaction({ recurring: false });

    expect(expandRecurringTransactions(transaction)).toEqual([transaction]);
  });

  it("creates the current launch plus the next 12 monthly occurrences", () => {
    const transaction = createTransaction({ date: "15/04/2026" });
    const occurrences = expandRecurringTransactions(transaction);

    expect(occurrences).toHaveLength(RECURRING_MONTHS_AHEAD + 1);
    expect(occurrences[0]).toEqual(transaction);
    expect(occurrences[1].date).toBe("15/05/2026");
    expect(occurrences[12].date).toBe("15/04/2027");
    expect(new Set(occurrences.map((occurrence) => occurrence.id)).size).toBe(occurrences.length);
  });

  it("falls back to the last valid day of shorter months", () => {
    const transaction = createTransaction({ date: "31/01/2026" });
    const occurrences = expandRecurringTransactions(transaction);

    expect(occurrences[1].date).toBe("28/02/2026");
    expect(occurrences[2].date).toBe("31/03/2026");
    expect(occurrences[3].date).toBe("30/04/2026");
  });
});
