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
  status: TransactionStatus;
  recurring: boolean;
  notes: string | null;
  tags: string[] | null;
};

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

function mapTransactionRowToState(row: FinanceTransactionRow): Transaction {
  return {
    id: row.id,
    date: row.transaction_date,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    type: row.transaction_type,
    amount: row.amount,
    status: row.status,
    recurring: row.recurring,
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
    transaction_type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    recurring: transaction.recurring,
    notes: transaction.notes ?? null,
    tags: transaction.tags ?? null,
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

  const [{ data: profile, error: profileError }, { data: transactions, error: transactionsError }] = await Promise.all([
    supabase.from("finance_profiles").select("*").eq("user_id", userId).maybeSingle<FinanceProfileRow>(),
    supabase
      .from("finance_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: true })
      .returns<FinanceTransactionRow[]>(),
  ]);

  if (profileError) {
    throw profileError;
  }

  if (transactionsError) {
    throw transactionsError;
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
  };

  const { error: profileError } = await supabase.from("finance_profiles").upsert(profilePayload, {
    onConflict: "user_id",
  });

  if (profileError) {
    throw profileError;
  }

  const transactionIds = state.transactions.map((transaction) => transaction.id);

  const { data: existingTransactions, error: existingError } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("user_id", userId)
    .returns<Array<{ id: string }>>();

  if (existingError) {
    throw existingError;
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
      throw deleteError;
    }
  }

  if (state.transactions.length === 0) {
    return;
  }

  const { error: transactionsError } = await supabase
    .from("finance_transactions")
    .upsert(state.transactions.map((transaction) => mapTransactionToRow(userId, transaction)), {
      onConflict: "user_id,id",
    });

  if (transactionsError) {
    throw transactionsError;
  }
}
