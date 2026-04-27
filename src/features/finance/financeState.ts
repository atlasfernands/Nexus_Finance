import {
  FinanceState,
  ReportingGranularity,
  ReportingPeriod,
  Transaction,
  TransactionMemory,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../../types";
import { compareDateStrings, generateId } from "../../lib/utils";

export const STORAGE_KEY = "controle-financeiro-integrado:v2";
export const LEGACY_STORAGE_KEY = "controle-financeiro-integrado:v1";

const MAX_CATEGORY_MEMORY = 100;
const MAX_DESCRIPTION_MEMORY = 200;

function createCurrentReportingPeriod(): ReportingPeriod {
  const now = new Date();

  return {
    month: now.getMonth(),
    year: now.getFullYear(),
    granularity: "month",
  };
}

export function createInitialState(): FinanceState {
  return {
    transactions: [],
    profile: {
      name: "Usuario",
      store: "Minha Loja",
      goal: 5000,
    },
    preferences: {
      showCents: true,
      includePendingInBalance: false,
      enableAlerts: true,
      animations: true,
    },
    transactionMemory: {
      categories: ["Outros"],
      descriptions: [],
    },
    reportingPeriod: createCurrentReportingPeriod(),
    aiInsights: {
      history: [],
    },
  };
}

export const initialState: FinanceState = createInitialState();

export function getStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function normalizeTransactionType(value: unknown): TransactionType {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized.includes("entrada") || normalized.includes("income")) {
    return TransactionType.INCOME;
  }

  return TransactionType.EXPENSE;
}

function normalizeTransactionStatus(value: unknown): TransactionStatus {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized.includes("pendente") || normalized.includes("pending")) {
    return TransactionStatus.PENDING;
  }

  if (normalized.includes("cancelado") || normalized.includes("cancelled")) {
    return TransactionStatus.CANCELLED;
  }

  if (normalized.includes("pago") || normalized.includes("paid")) {
    return TransactionStatus.PAID;
  }

  return TransactionStatus.COMPLETED;
}

function normalizeTransactionSubcategory(value: unknown): TransactionSubcategory {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized.includes("loja") || normalized.includes("store") || normalized.includes("mei")) {
    return TransactionSubcategory.STORE;
  }

  return TransactionSubcategory.HOME;
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function cleanMemoryItem(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getMemoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dedupeMemoryItems(values: unknown[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const cleaned = cleanMemoryItem(value);
    const key = getMemoryKey(cleaned);

    if (!cleaned || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(cleaned);
  });

  return result.slice(0, limit);
}

function createMemoryFromTransactions(transactions: Transaction[]): TransactionMemory {
  return {
    categories: dedupeMemoryItems(
      ["Outros", ...transactions.map((transaction) => transaction.category)].sort((left, right) =>
        String(left).localeCompare(String(right), "pt-BR")
      ),
      MAX_CATEGORY_MEMORY
    ),
    descriptions: dedupeMemoryItems(
      [...transactions].reverse().map((transaction) => transaction.description),
      MAX_DESCRIPTION_MEMORY
    ),
  };
}

function normalizeTransactionMemory(
  value: unknown,
  fallback: TransactionMemory,
  transactions: Transaction[]
): TransactionMemory {
  const memory = (value ?? {}) as Partial<Record<keyof TransactionMemory, unknown>>;
  const derivedMemory = createMemoryFromTransactions(transactions);

  return {
    categories: dedupeMemoryItems(
      [
        ...((Array.isArray(memory.categories) ? memory.categories : fallback.categories) ?? []),
        ...derivedMemory.categories,
      ].sort((left, right) => String(left).localeCompare(String(right), "pt-BR")),
      MAX_CATEGORY_MEMORY
    ),
    descriptions: dedupeMemoryItems(
      [
        ...((Array.isArray(memory.descriptions) ? memory.descriptions : fallback.descriptions) ?? []),
        ...derivedMemory.descriptions,
      ],
      MAX_DESCRIPTION_MEMORY
    ),
  };
}

function rememberMemoryItem(items: string[], value: unknown, limit: number, sortItems = false): string[] {
  const cleaned = cleanMemoryItem(value);

  if (!cleaned) {
    return items;
  }

  const withoutDuplicate = items.filter((item) => getMemoryKey(item) !== getMemoryKey(cleaned));
  const nextItems = sortItems
    ? [...withoutDuplicate, cleaned].sort((left, right) => left.localeCompare(right, "pt-BR"))
    : [cleaned, ...withoutDuplicate];

  return nextItems.slice(0, limit);
}

export function rememberTransactions(memory: TransactionMemory, transactions: Transaction[]): TransactionMemory {
  return transactions.reduce(
    (currentMemory, transaction) => ({
      categories: rememberMemoryItem(currentMemory.categories, transaction.category, MAX_CATEGORY_MEMORY, true),
      descriptions: rememberMemoryItem(currentMemory.descriptions, transaction.description, MAX_DESCRIPTION_MEMORY),
    }),
    memory
  );
}

function normalizeReportingGranularity(
  value: unknown,
  fallback: ReportingGranularity
): ReportingGranularity {
  return value === "month" || value === "year" ? value : fallback;
}

function normalizeReportingMonth(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 11 ? parsed : fallback;
}

function normalizeReportingYear(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : fallback;
}

function normalizeTransaction(raw: unknown): Transaction {
  const transaction = (raw ?? {}) as Record<string, unknown>;
  const runningBalanceValue = transaction.runningBalance ?? transaction.saldoAcumulado;
  const sourceOrderValue = transaction.sourceOrder ?? transaction.ordemLinha;

  return {
    id: normalizeString(transaction.id, generateId()),
    date: normalizeString(transaction.date ?? transaction.data, new Date().toLocaleDateString("pt-BR")),
    description: normalizeString(transaction.description ?? transaction.descricao, "Sem descricao"),
    category: normalizeString(transaction.category ?? transaction.categoria, "Outros"),
    subcategory: normalizeTransactionSubcategory(transaction.subcategory ?? transaction.subcategoria),
    type: normalizeTransactionType(transaction.type ?? transaction.tipo),
    amount: normalizeNumber(transaction.amount ?? transaction.valor, 0),
    runningBalance:
      runningBalanceValue === undefined ? undefined : normalizeNumber(runningBalanceValue, 0),
    status: normalizeTransactionStatus(transaction.status),
    recurring: Boolean(transaction.recurring ?? transaction.recorrente ?? false),
    sourceOrder: sourceOrderValue === undefined ? undefined : normalizeNumber(sourceOrderValue, 0),
    notes: typeof transaction.notes === "string" ? transaction.notes : undefined,
    tags: Array.isArray(transaction.tags)
      ? transaction.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
  };
}

export function normalizeFinanceState(rawState: unknown, fallbackState: FinanceState): FinanceState {
  const state = (rawState ?? {}) as Record<string, unknown>;
  const profile = (state.profile ?? {}) as Record<string, unknown>;
  const preferences = (state.preferences ?? {}) as Record<string, unknown>;
  const reportingPeriod = (state.reportingPeriod ?? {}) as Record<string, unknown>;
  const aiInsights = (state.aiInsights ?? {}) as Record<string, unknown>;
  const transactions = Array.isArray(state.transactions)
    ? state.transactions.map(normalizeTransaction)
    : fallbackState.transactions;

  return {
    transactions,
    profile: {
      name: normalizeString(profile.name ?? profile.nome, fallbackState.profile.name),
      store: normalizeString(profile.store ?? profile.loja, fallbackState.profile.store),
      goal: normalizeNumber(profile.goal ?? profile.meta, fallbackState.profile.goal),
    },
    preferences: {
      showCents: Boolean(
        preferences.showCents ?? preferences.mostrarCentavos ?? fallbackState.preferences.showCents
      ),
      includePendingInBalance: Boolean(
        preferences.includePendingInBalance ??
          preferences.incluirPendentesNoSaldo ??
          fallbackState.preferences.includePendingInBalance
      ),
      enableAlerts: Boolean(
        preferences.enableAlerts ?? preferences.ativarAlertas ?? fallbackState.preferences.enableAlerts
      ),
      animations: Boolean(
        preferences.animations ?? preferences.animacoes ?? fallbackState.preferences.animations
      ),
    },
    transactionMemory: normalizeTransactionMemory(
      state.transactionMemory ?? state.memoriaLancamentos,
      fallbackState.transactionMemory,
      transactions
    ),
    reportingPeriod: {
      month: normalizeReportingMonth(reportingPeriod.month, fallbackState.reportingPeriod.month),
      year: normalizeReportingYear(reportingPeriod.year, fallbackState.reportingPeriod.year),
      granularity: normalizeReportingGranularity(
        reportingPeriod.granularity,
        fallbackState.reportingPeriod.granularity
      ),
    },
    aiInsights: {
      lastAnalysis: typeof aiInsights.lastAnalysis === "string" ? aiInsights.lastAnalysis : undefined,
      history: Array.isArray(aiInsights.history)
        ? aiInsights.history
            .map((entry) => {
              const insight = (entry ?? {}) as Record<string, unknown>;

              return {
                date: normalizeString(insight.date, new Date().toISOString()),
                content: normalizeString(insight.content, ""),
              };
            })
            .filter((entry) => entry.content !== "")
        : fallbackState.aiInsights.history,
    },
  };
}

export function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    if (typeof left.sourceOrder === "number" && typeof right.sourceOrder === "number") {
      return left.sourceOrder - right.sourceOrder;
    }

    const dateComparison = compareDateStrings(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return left.description.localeCompare(right.description, "pt-BR");
  });
}

export function mergeTransactions(currentTransactions: Transaction[], nextTransactions: Transaction[]): Transaction[] {
  return sortTransactionsByDate([...currentTransactions, ...nextTransactions]);
}
