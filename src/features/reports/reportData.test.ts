import { describe, expect, it } from "vitest";
import { ReportingPeriod, Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../../types";
import { buildComparisonData, buildTrendData } from "./reportData";

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

describe("reportData", () => {
  it("keeps pending transactions out of trend and comparison totals", () => {
    const period: ReportingPeriod = {
      month: 3,
      year: 2026,
      granularity: "month",
    };
    const transactions = [
      createTransaction({
        type: TransactionType.INCOME,
        amount: 500,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        type: TransactionType.EXPENSE,
        amount: 200,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        type: TransactionType.INCOME,
        amount: 100,
        status: TransactionStatus.PENDING,
      }),
      createTransaction({
        type: TransactionType.EXPENSE,
        amount: 50,
        status: TransactionStatus.PENDING,
      }),
    ];

    const trendData = buildTrendData(transactions, period);
    const comparisonData = buildComparisonData(transactions);
    const aprilTrend = trendData.find((item) => item.name.includes("abr."));

    expect(aprilTrend?.entradas).toBe(500);
    expect(aprilTrend?.saidas).toBe(200);
    expect(comparisonData[0].entradas).toBe(500);
    expect(comparisonData[0].saidas).toBe(200);
  });
});
