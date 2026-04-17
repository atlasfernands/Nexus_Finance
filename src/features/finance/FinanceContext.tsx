/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { FinanceState, FinanceAction, Transaction } from "../types";
import { loadState, saveState } from "../../lib/storage";

const STORAGE_KEY = "controle-financeiro-integrado:v1";

const initialState: FinanceState = {
  transactions: [],
  profile: {
    nome: "Usuário",
    loja: "Minha Loja",
    meta: 5000,
  },
  preferences: {
    mostrarCentavos: true,
    incluirPendentesNoSaldo: false,
    ativarAlertas: true,
    animacoes: true,
  },
  aiInsights: {
    history: [],
  },
};

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case "ADD_TRANSACTION":
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };
    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.payload };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case "UPDATE_PREFERENCES":
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case "ADD_AI_INSIGHT":
      return {
        ...state,
        aiInsights: {
          lastAnalysis: action.payload,
          history: [{ date: new Date().toISOString(), content: action.payload }, ...state.aiInsights.history].slice(0, 5),
        },
      };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

const FinanceContext = createContext<{
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
} | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, initialState, (initial) => loadState(STORAGE_KEY, initial));

  useEffect(() => {
    saveState(STORAGE_KEY, state);
  }, [state]);

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
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
