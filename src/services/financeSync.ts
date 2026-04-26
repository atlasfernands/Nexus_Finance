import { supabase } from "../lib/supabase";
import {
  FinanceState,
  ReportingGranularity,
  ReportingPeriod,
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../types";

type FinanceProfileRow = {
  user_id: string;
  full_name: string | null;
  store_name: string | null;
  monthly_goal: number | null;
  show_cents: boolean | null;
  include_pending_in_balance: boolean | null;
  enable_alerts: boolean | null;
  animations_enabled: boolean | null;
  reporting_month: number | null;
  reporting_year: number | null;
  reporting_granularity: ReportingGranularity | null;
  ai_last_analysis: string | null;
  ai_history: Array<{ date: string; content: string }> | null;
  category_memory?: string[] | null;
  description_memory?: string[] | null;
};

type FinanceTransactionRow = {
  id: string;
  user_id: string;
  transaction_date: string;
  description: string;
  category: string;
  subcategory: TransactionSubcategory;
  transaction_type: TransactionType;
  amount: number;
  running_balance?: number | null;
  source_order?: number | null;
  status: TransactionStatus;
  recurring: boolean;
  notes?: string | null;
  tags?: string[] | null;
};

function normalizeEnumText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeBoolean(value: boolean | null | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeString(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function normalizeGranularity(
  value: ReportingGranularity | null | undefined,
  fallback: ReportingGranularity
): ReportingGranularity {
  return value === "month" || value === "year" ? value : fallback;
}

function normalizeRemoteTransactionType(
  value: FinanceTransactionRow["transaction_type"] | string | null | undefined
): TransactionType {
  const normalized = normalizeEnumText(value);

  if (normalized.includes("entrada") || normalized.includes("income")) {
    return TransactionType.INCOME;
  }

  return TransactionType.EXPENSE;
}

function normalizeRemoteTransactionStatus(
  value: FinanceTransactionRow["status"] | string | null | undefined
): TransactionStatus {
  const normalized = normalizeEnumText(value);

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

function normalizeRemoteTransactionSubcategory(
  value: FinanceTransactionRow["subcategory"] | string | null | undefined
): TransactionSubcategory {
  const normalized = normalizeEnumText(value);

  if (normalized.includes("loja") || normalized.includes("store") || normalized.includes("mei")) {
    return TransactionSubcategory.STORE;
  }

  return TransactionSubcategory.HOME;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

function isMissingRelationError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("relation") && message.includes("finance_transactions");
}

function isMetadataColumnMismatch(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return ["running_balance", "source_order", "notes", "tags", "category_memory", "description_memory"].some(
    (column) => message.includes(column) && (message.includes("column") || message.includes("schema cache"))
  );
}

function isProfileMemoryColumnMismatch(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return ["category_memory", "description_memory"].some(
    (column) => message.includes(column) && (message.includes("column") || message.includes("schema cache"))
  );
}

function isTransactionTypeConstraintError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("finance_transactions_transaction_type_check") || message.includes("transaction_type");
}

function createFinanceSyncError(scope: string, error: unknown) {
  if (isTransactionTypeConstraintError(error)) {
    return new Error(
      "O servidor ainda esta com a validacao antiga de tipo de transacao. Aplique a migracao supabase/migrations/20260425195500_fix_transaction_type_encoding.sql no projeto Supabase."
    );
  }

  if (isMissingRelationError(error)) {
    return new Error(
      "A tabela finance_transactions ainda nao esta pronta no servidor. Rode o schema do Supabase ou aplique as migracoes pendentes antes de sincronizar os lancamentos."
    );
  }

  if (isMetadataColumnMismatch(error)) {
    return new Error(
      "O servidor esta com uma versao antiga da tabela de lancamentos. Aplique as migracoes mais recentes do Supabase para sincronizar todos os campos."
    );
  }

  return new Error(`Falha ao sincronizar dados financeiros (${scope}): ${getErrorMessage(error)}`);
}

function mapTransactionRowToState(row: FinanceTransactionRow): Transaction {
  return {
    id: row.id,
    date: row.transaction_date,
    description: row.description,
    category: row.category,
    subcategory: normalizeRemoteTransactionSubcategory(row.subcategory),
    type: normalizeRemoteTransactionType(row.transaction_type),
    amount: row.amount,
    runningBalance: row.running_balance ?? undefined,
    status: normalizeRemoteTransactionStatus(row.status),
    recurring: row.recurring,
    sourceOrder: row.source_order ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
  };
}

function mapTransactionToRow(userId: string, transaction: Transaction): FinanceTransactionRow {
  return {
    id: transaction.id,
    user_id: userId,
    transaction_date: transaction.date,
    description: transaction.description,
    category: transaction.category,
    subcategory: transaction.subcategory,
    transaction_type: normalizeRemoteTransactionType(transaction.type),
    amount: transaction.amount,
    running_balance: transaction.runningBalance ?? null,
    source_order: transaction.sourceOrder ?? null,
    status: normalizeRemoteTransactionStatus(transaction.status),
    recurring: transaction.recurring,
    notes: transaction.notes ?? null,
    tags: transaction.tags ?? null,
  };
}

function mapTransactionToLegacyRow(userId: string, transaction: Transaction): FinanceTransactionRow {
  return {
    id: transaction.id,
    user_id: userId,
    transaction_date: transaction.date,
    description: transaction.description,
    category: transaction.category,
    subcategory: transaction.subcategory,
    transaction_type: normalizeRemoteTransactionType(transaction.type),
    amount: transaction.amount,
    status: normalizeRemoteTransactionStatus(transaction.status),
    recurring: transaction.recurring,
  };
}

function mapProfileToState(
  profile: FinanceProfileRow | null,
  fallbackPeriod: ReportingPeriod
): Omit<FinanceState, "transactions"> {
  return {
    profile: {
      name: normalizeString(profile?.full_name, "Usuario"),
      store: normalizeString(profile?.store_name, "Minha Loja"),
      goal: normalizeNumber(profile?.monthly_goal, 5000),
    },
    preferences: {
      showCents: normalizeBoolean(profile?.show_cents, true),
      includePendingInBalance: normalizeBoolean(profile?.include_pending_in_balance, false),
      enableAlerts: normalizeBoolean(profile?.enable_alerts, true),
      animations: normalizeBoolean(profile?.animations_enabled, true),
    },
    reportingPeriod: {
      month: normalizeNumber(profile?.reporting_month, fallbackPeriod.month),
      year: normalizeNumber(profile?.reporting_year, fallbackPeriod.year),
      granularity: normalizeGranularity(profile?.reporting_granularity, fallbackPeriod.granularity),
    },
    transactionMemory: {
      categories: Array.isArray(profile?.category_memory) ? profile.category_memory : [],
      descriptions: Array.isArray(profile?.description_memory) ? profile.description_memory : [],
    },
    aiInsights: {
      lastAnalysis: profile?.ai_last_analysis ?? undefined,
      history: Array.isArray(profile?.ai_history) ? profile.ai_history : [],
    },
  };
}

export async function fetchRemoteFinanceState(
  userId: string,
  fallbackPeriod: ReportingPeriod
): Promise<FinanceState | null> {
  if (!supabase) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("finance_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<FinanceProfileRow>();

  if (profileError) {
    throw createFinanceSyncError("profile_read", profileError);
  }

  let transactions: FinanceTransactionRow[] = [];

  const fullTransactionsQuery = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("source_order", { ascending: true, nullsFirst: false })
    .order("transaction_date", { ascending: true })
    .returns<FinanceTransactionRow[]>();

  if (fullTransactionsQuery.error) {
    if (isMetadataColumnMismatch(fullTransactionsQuery.error)) {
      const legacyTransactionsQuery = await supabase
        .from("finance_transactions")
        .select("id,user_id,transaction_date,description,category,subcategory,transaction_type,amount,status,recurring")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: true })
        .returns<FinanceTransactionRow[]>();

      if (legacyTransactionsQuery.error) {
        if (!profile) {
          throw createFinanceSyncError("transactions_read", legacyTransactionsQuery.error);
        }

        console.error("Falha ao ler lancamentos remotos do Supabase", legacyTransactionsQuery.error);
      } else {
        transactions = legacyTransactionsQuery.data ?? [];
      }
    } else if (!profile) {
      throw createFinanceSyncError("transactions_read", fullTransactionsQuery.error);
    } else {
      console.error("Falha ao ler lancamentos remotos do Supabase", fullTransactionsQuery.error);
    }
  } else {
    transactions = fullTransactionsQuery.data ?? [];
  }

  if (!profile && (!transactions || transactions.length === 0)) {
    return null;
  }

  return {
    ...mapProfileToState(profile, fallbackPeriod),
    transactions: (transactions ?? []).map(mapTransactionRowToState),
  };
}

export async function saveRemoteFinanceState(userId: string, state: FinanceState): Promise<void> {
  if (!supabase) {
    return;
  }

  const profilePayload = {
    user_id: userId,
    full_name: state.profile.name,
    store_name: state.profile.store,
    monthly_goal: state.profile.goal,
    show_cents: state.preferences.showCents,
    include_pending_in_balance: state.preferences.includePendingInBalance,
    enable_alerts: state.preferences.enableAlerts,
    animations_enabled: state.preferences.animations,
    reporting_month: state.reportingPeriod.month,
    reporting_year: state.reportingPeriod.year,
    reporting_granularity: state.reportingPeriod.granularity,
    ai_last_analysis: state.aiInsights.lastAnalysis ?? null,
    ai_history: state.aiInsights.history,
    category_memory: state.transactionMemory.categories,
    description_memory: state.transactionMemory.descriptions,
  };

  const profileUpsert = await supabase.from("finance_profiles").upsert(profilePayload, {
    onConflict: "user_id",
  });

  if (profileUpsert.error) {
    if (isProfileMemoryColumnMismatch(profileUpsert.error)) {
      const {
        category_memory: _categoryMemory,
        description_memory: _descriptionMemory,
        ...legacyProfilePayload
      } = profilePayload;
      const { error: legacyProfileError } = await supabase.from("finance_profiles").upsert(legacyProfilePayload, {
        onConflict: "user_id",
      });

      if (legacyProfileError) {
        throw createFinanceSyncError("profile_write", legacyProfileError);
      }
    } else {
      throw createFinanceSyncError("profile_write", profileUpsert.error);
    }
  }

  const transactionIds = state.transactions.map((transaction) => transaction.id);

  const { data: existingTransactions, error: existingError } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("user_id", userId)
    .returns<Array<{ id: string }>>();

  if (existingError) {
    if (state.transactions.length === 0 && isMissingRelationError(existingError)) {
      console.error("Tabela finance_transactions ainda indisponivel no servidor; perfil salvo mesmo assim.", existingError);
      return;
    }

    throw createFinanceSyncError("transactions_list", existingError);
  }

  const staleTransactionIds = (existingTransactions ?? [])
    .map((transaction) => transaction.id)
    .filter((id) => !transactionIds.includes(id));

  if (staleTransactionIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("finance_transactions")
      .delete()
      .eq("user_id", userId)
      .in("id", staleTransactionIds);

    if (deleteError) {
      throw createFinanceSyncError("transactions_delete", deleteError);
    }
  }

  if (state.transactions.length === 0) {
    return;
  }

  const primaryUpsert = await supabase
    .from("finance_transactions")
    .upsert(state.transactions.map((transaction) => mapTransactionToRow(userId, transaction)), {
      onConflict: "user_id,id",
    });

  if (!primaryUpsert.error) {
    return;
  }

  if (isMetadataColumnMismatch(primaryUpsert.error)) {
    const legacyUpsert = await supabase
      .from("finance_transactions")
      .upsert(state.transactions.map((transaction) => mapTransactionToLegacyRow(userId, transaction)), {
        onConflict: "user_id,id",
      });

    if (!legacyUpsert.error) {
      return;
    }

    throw createFinanceSyncError("transactions_write", legacyUpsert.error);
  }

  throw createFinanceSyncError("transactions_write", primaryUpsert.error);
}
