/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { FinanceAction, FinanceState, Transaction } from "../../types";
import {
  buildDuplicateTransactionMessage,
  findDuplicateTransaction,
  partitionTransactionsByDuplicates,
} from "../../lib/transactionDuplicates";
import { loadOptionalState, saveState } from "../../lib/storage";
import { useAuth } from "../auth/AuthContext";
import { fetchRemoteFinanceState, saveRemoteFinanceState } from "../../services/financeSync";
import { financeReducer } from "./financeReducer";
import {
  LEGACY_STORAGE_KEY,
  createInitialState,
  getStorageKey,
  initialState,
  mergeTransactions,
  normalizeFinanceState,
  rememberTransactions,
  sortTransactionsByDate,
} from "./financeState";

interface ImportTransactionsResult {
  duplicateCount: number;
  importedCount: number;
  keptDuplicateCount: number;
}

interface SaveTransactionOptions {
  allowDuplicate?: boolean;
}

interface ImportTransactionsOptions {
  allowDuplicateIds?: string[];
}

interface FinanceContextValue {
  addTransaction: (transaction: Transaction, options?: SaveTransactionOptions) => void;
  importTransactions: (
    transactions: Transaction[],
    options?: ImportTransactionsOptions
  ) => Promise<ImportTransactionsResult>;
  isReady: boolean;
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
  updateTransaction: (transaction: Transaction, options?: SaveTransactionOptions) => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { isConfigured, isReady: authReady, user } = useAuth();
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const [isReady, setIsReady] = useState(false);
  const hasHydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");

  const persistStateImmediately = async (nextState: FinanceState) => {
    const storageKey = getStorageKey(user?.id);
    saveState(storageKey, nextState);

    const snapshot = JSON.stringify(nextState);

    if (!isConfigured || !user) {
      lastSavedSnapshotRef.current = snapshot;
      return;
    }

    await saveRemoteFinanceState(user.id, nextState);
    lastSavedSnapshotRef.current = snapshot;
  };

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

  const addTransaction = (transaction: Transaction, options?: SaveTransactionOptions) => {
    const duplicate = findDuplicateTransaction(transaction, state.transactions);

    if (duplicate && !options?.allowDuplicate) {
      throw new Error(buildDuplicateTransactionMessage(duplicate));
    }

    if (options?.allowDuplicate) {
      dispatch({
        type: "SET_TRANSACTIONS",
        payload: sortTransactionsByDate([...state.transactions, transaction]),
      });
      return;
    }

    dispatch({ type: "ADD_TRANSACTION", payload: transaction });
  };

  const updateTransaction = (transaction: Transaction, options?: SaveTransactionOptions) => {
    const duplicate = findDuplicateTransaction(transaction, state.transactions, { ignoreId: transaction.id });

    if (duplicate && !options?.allowDuplicate) {
      throw new Error(buildDuplicateTransactionMessage(duplicate));
    }

    if (options?.allowDuplicate) {
      dispatch({
        type: "SET_TRANSACTIONS",
        payload: sortTransactionsByDate(
          state.transactions.map((currentTransaction) =>
            currentTransaction.id === transaction.id ? transaction : currentTransaction
          )
        ),
      });
      return;
    }

    dispatch({ type: "UPDATE_TRANSACTION", payload: transaction });
  };

  const importTransactions = async (
    transactions: Transaction[],
    options?: ImportTransactionsOptions
  ) => {
    if (transactions.length === 0) {
      return {
        duplicateCount: 0,
        importedCount: 0,
        keptDuplicateCount: 0,
      };
    }

    const { accepted, duplicates } = partitionTransactionsByDuplicates(transactions, state.transactions);
    const allowedDuplicateIds = new Set(options?.allowDuplicateIds ?? []);
    const keptDuplicates = duplicates
      .filter((duplicate) => allowedDuplicateIds.has(duplicate.transaction.id))
      .map((duplicate) => duplicate.transaction);
    const ignoredDuplicates = duplicates.filter((duplicate) => !allowedDuplicateIds.has(duplicate.transaction.id));
    const transactionsToPersist = [...accepted, ...keptDuplicates];

    if (transactionsToPersist.length === 0) {
      return {
        duplicateCount: ignoredDuplicates.length,
        importedCount: 0,
        keptDuplicateCount: keptDuplicates.length,
      };
    }

    const nextState = {
      ...state,
      transactionMemory: rememberTransactions(state.transactionMemory, transactionsToPersist),
      transactions: mergeTransactions(state.transactions, transactionsToPersist),
    };

    dispatch({ type: "SET_TRANSACTIONS", payload: nextState.transactions });

    if (!hasHydratedRef.current) {
      return {
        duplicateCount: ignoredDuplicates.length,
        importedCount: transactionsToPersist.length,
        keptDuplicateCount: keptDuplicates.length,
      };
    }

    try {
      await persistStateImmediately(nextState);
    } catch (error) {
      console.error("Falha ao sincronizar importacao com o Supabase", error);
      throw error;
    }

    return {
      duplicateCount: ignoredDuplicates.length,
      importedCount: transactionsToPersist.length,
      keptDuplicateCount: keptDuplicates.length,
    };
  };

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

  return (
    <FinanceContext.Provider
      value={{ addTransaction, importTransactions, isReady, state, dispatch, updateTransaction }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }

  return context;
}
