import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceState, Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../../types";
import { createInitialState } from "./financeState";
import { useFinanceStats } from "./useFinanceStats";

const financeMock = vi.hoisted(() => ({
  state: undefined as unknown,
}));

vi.mock("./FinanceContext", () => ({
  useFinance: () => ({
    state: financeMock.state,
  }),
}));

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

function setFinanceState(transactions: Transaction[], overrides: Partial<FinanceState> = {}) {
  const initialState = createInitialState();
  const state: FinanceState = {
    ...initialState,
    ...overrides,
    preferences: {
      ...initialState.preferences,
      ...overrides.preferences,
    },
    reportingPeriod: {
      month: 3,
      year: 2026,
      granularity: "month",
      ...overrides.reportingPeriod,
    },
    transactions,
  };

  financeMock.state = state;
}

describe("useFinanceStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 2, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps pending transactions out of realized account totals", () => {
    setFinanceState([
      createTransaction({
        id: "received",
        type: TransactionType.INCOME,
        amount: 500,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        id: "paid",
        type: TransactionType.EXPENSE,
        amount: 200,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        id: "pending-income",
        type: TransactionType.INCOME,
        amount: 100,
        status: TransactionStatus.PENDING,
      }),
      createTransaction({
        id: "pending-expense",
        type: TransactionType.EXPENSE,
        amount: 50,
        status: TransactionStatus.PENDING,
      }),
    ]);

    const result = useFinanceStats();

    expect(result.saldoRealizado).toBe(300);
    expect(result.saldoMesAtual).toBe(300);
    expect(result.entradasMes).toBe(500);
    expect(result.saidasMes).toBe(200);
    expect(result.saldoProjetado).toBe(300);
    expect(result.pendingBalanceImpact).toBe(50);
    expect(result.monthlyFlow[1].entradas).toBe(500);
    expect(result.monthlyFlow[1].saidas).toBe(200);
  });

  it("uses the real daily account balance instead of the monthly net flow", () => {
    setFinanceState(
      [
        createTransaction({
          id: "previous-real-balance",
          date: "30/04/2026",
          description: "Saldo inicial real",
          type: TransactionType.INCOME,
          amount: 244.65,
          status: TransactionStatus.PAID,
        }),
        createTransaction({
          id: "amazon",
          date: "01/05/2026",
          type: TransactionType.INCOME,
          amount: 12,
          status: TransactionStatus.PAID,
        }),
        createTransaction({
          id: "store-clients",
          date: "01/05/2026",
          type: TransactionType.INCOME,
          amount: 180,
          status: TransactionStatus.PAID,
          subcategory: TransactionSubcategory.STORE,
        }),
        createTransaction({
          id: "motoboy",
          date: "01/05/2026",
          type: TransactionType.INCOME,
          amount: 3,
          status: TransactionStatus.PAID,
          subcategory: TransactionSubcategory.STORE,
        }),
        createTransaction({
          id: "fraldas",
          date: "01/05/2026",
          type: TransactionType.INCOME,
          amount: 115,
          status: TransactionStatus.PAID,
        }),
        createTransaction({
          id: "aluguel",
          date: "01/05/2026",
          description: "Aluguel",
          category: "Moradia",
          type: TransactionType.EXPENSE,
          amount: 700,
          status: TransactionStatus.PENDING,
        }),
        createTransaction({
          id: "padaria",
          date: "02/05/2026",
          type: TransactionType.EXPENSE,
          amount: 54.02,
          status: TransactionStatus.PAID,
        }),
      ],
      {
        reportingPeriod: {
          month: 4,
          year: 2026,
          granularity: "month",
        },
      }
    );

    const result = useFinanceStats();

    expect(result.entradasMes).toBe(310);
    expect(result.saidasMes).toBe(54.02);
    expect(result.saldoRealizado).toBe(500.63);
    expect(result.saldoMesAtual).toBe(500.63);
    expect(result.saldoProjetado).toBe(500.63);
    expect(result.firstNegativePendingEvent?.balanceBefore).toBe(554.65);
    expect(result.firstNegativePendingEvent?.shortageAmount).toBe(145.35);
    expect(result.dailyBalanceTimeline[0].saldoRealDoDia).toBe(554.65);
  });

  it("keeps realized balance negative when paid expenses exceed received income", () => {
    setFinanceState([
      createTransaction({
        id: "paid-income",
        type: TransactionType.INCOME,
        amount: 100,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        id: "paid-expense",
        type: TransactionType.EXPENSE,
        amount: 180,
        status: TransactionStatus.PAID,
      }),
      createTransaction({
        id: "pending-income",
        type: TransactionType.INCOME,
        amount: 500,
        status: TransactionStatus.PENDING,
      }),
    ]);

    const result = useFinanceStats();

    expect(result.saldoRealizado).toBe(-80);
    expect(result.saldoMesAtual).toBe(-80);
    expect(result.saldoProjetado).toBe(-80);
    expect(result.pendingBalanceImpact).toBe(500);
  });

  it("can show pending impact only in projected balance when enabled", () => {
    setFinanceState(
      [
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
          type: TransactionType.EXPENSE,
          amount: 50,
          status: TransactionStatus.PENDING,
        }),
      ],
      {
        preferences: {
          ...createInitialState().preferences,
          includePendingInBalance: true,
        },
      }
    );

    const result = useFinanceStats();

    expect(result.saldoRealizado).toBe(300);
    expect(result.saldoProjetado).toBe(250);
  });
});
