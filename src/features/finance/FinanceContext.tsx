/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import {
  FinanceAction,
  FinanceState,
  ReportingGranularity,
  ReportingPeriod,
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../../types";
import { loadOptionalState, saveState } from "../../lib/storage";
import { compareDateStrings, generateId } from "../../lib/utils";
import { useAuth } from "../auth/AuthContext";
import { fetchRemoteFinanceState, saveRemoteFinanceState } from "../../services/financeSync";

const STORAGE_KEY = "controle-financeiro-integrado:v2";
const LEGACY_STORAGE_KEY = "controle-financeiro-integrado:v1";

function createCurrentReportingPeriod(): ReportingPeriod {
  const now = new Date();

  return {
    month: now.getMonth(),
    year: now.getFullYear(),
    granularity: "month",
  };
}

function createInitialState(): FinanceState {
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
    reportingPeriod: createCurrentReportingPeriod(),
    aiInsights: {
      history: [],
    },
  };
}

const initialState: FinanceState = createInitialState();

function getStorageKey(userId?: string | null) {
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

  return {
    id: normalizeString(transaction.id, generateId()),
    date: normalizeString(transaction.date ?? transaction.data, new Date().toLocaleDateString("pt-BR")),
    description: normalizeString(transaction.description ?? transaction.descricao, "Sem descricao"),
    category: normalizeString(transaction.category ?? transaction.categoria, "Outros"),
    subcategory: normalizeTransactionSubcategory(transaction.subcategory ?? transaction.subcategoria),
    type: normalizeTransactionType(transaction.type ?? transaction.tipo),
    amount: normalizeNumber(transaction.amount ?? transaction.valor, 0),
    status: normalizeTransactionStatus(transaction.status),
    recurring: Boolean(transaction.recurring ?? transaction.recorrente ?? false),
    notes: typeof transaction.notes === "string" ? transaction.notes : undefined,
    tags: Array.isArray(transaction.tags)
      ? transaction.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
  };
}

function normalizeFinanceState(rawState: unknown, fallbackState: FinanceState): FinanceState {
  const state = (rawState ?? {}) as Record<string, any>;
  const profile = (state.profile ?? {}) as Record<string, unknown>;
  const preferences = (state.preferences ?? {}) as Record<string, unknown>;
  const reportingPeriod = (state.reportingPeriod ?? {}) as Record<string, unknown>;
  const aiInsights = (state.aiInsights ?? {}) as Record<string, unknown>;

  return {
    transactions: Array.isArray(state.transactions)
      ? state.transactions.map(normalizeTransaction)
      : fallbackState.transactions,
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

function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    const dateComparison = compareDateStrings(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return left.description.localeCompare(right.description, "pt-BR");
  });
}

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case "HYDRATE_STATE":
      return normalizeFinanceState(action.payload, createInitialState());
    case "ADD_TRANSACTION":
      return { ...state, transactions: sortTransactionsByDate([...state.transactions, action.payload]) };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: sortTransactionsByDate(
          state.transactions.map((transaction) => (transaction.id === action.payload.id ? action.payload : transaction))
        ),
      };
    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.payload),
      };
    case "SET_TRANSACTIONS":
      return { ...state, transactions: sortTransactionsByDate(action.payload) };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case "UPDATE_PREFERENCES":
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case "UPDATE_REPORTING_PERIOD":
      return { ...state, reportingPeriod: { ...state.reportingPeriod, ...action.payload } };
    case "ADD_AI_INSIGHT":
      return {
        ...state,
        aiInsights: {
          lastAnalysis: action.payload,
          history: [{ date: new Date().toISOString(), content: action.payload }, ...state.aiInsights.history].slice(
            0,
            5
          ),
        },
      };
    case "RESET_STATE":
      return createInitialState();
    default:
      return state;
  }
}

const FinanceContext = createContext<
  | {
      isReady: boolean;
      state: FinanceState;
      dispatch: React.Dispatch<FinanceAction>;
    }
  | undefined
>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { isConfigured, isReady: authReady, user } = useAuth();
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const [isReady, setIsReady] = useState(false);
  const hasHydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;

    const hydrateState = async () => {
      setIsReady(false);

      const fallbackState = createInitialState();
      const userScopedStorageKey = getStorageKey(user?.id);
      const cachedUserState = loadOptionalState<FinanceState>(userScopedStorageKey);
      const cachedLegacyState = loadOptionalState<FinanceState>(LEGACY_STORAGE_KEY);
      const localState = normalizeFinanceState(
        user ? cachedUserState ?? cachedLegacyState : cachedLegacyState,
        fallbackState
      );

      if (!isConfigured || !user) {
        if (!cancelled) {
          dispatch({ type: "HYDRATE_STATE", payload: localState });
          hasHydratedRef.current = true;
          setIsReady(true);
        }
        return;
      }

      try {
        const remoteState = await fetchRemoteFinanceState(user.id, fallbackState.reportingPeriod);
        if (cancelled) {
          return;
        }

        const nextState = remoteState ? normalizeFinanceState(remoteState, fallbackState) : localState;
        dispatch({ type: "HYDRATE_STATE", payload: nextState });
        saveState(userScopedStorageKey, nextState);

        if (!remoteState) {
          await saveRemoteFinanceState(user.id, nextState);
        }
      } catch (error) {
        console.error("Falha ao carregar dados financeiros do Supabase", error);
        if (!cancelled) {
          dispatch({ type: "HYDRATE_STATE", payload: localState });
        }
      } finally {
        if (!cancelled) {
          hasHydratedRef.current = true;
          setIsReady(true);
        }
      }
    };

    hydrateState();

    return () => {
      cancelled = true;
      hasHydratedRef.current = false;
      lastSavedSnapshotRef.current = "";
    };
  }, [authReady, isConfigured, user?.id]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    const storageKey = getStorageKey(user?.id);
    saveState(storageKey, state);

    if (!isConfigured || !user) {
      return;
    }

    const snapshot = JSON.stringify(state);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveRemoteFinanceState(user.id, state)
        .then(() => {
          lastSavedSnapshotRef.current = snapshot;
        })
        .catch((error) => {
          console.error("Falha ao salvar dados financeiros no Supabase", error);
        });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isConfigured, state, user?.id]);

  return <FinanceContext.Provider value={{ isReady, state, dispatch }}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }

  return context;
}
