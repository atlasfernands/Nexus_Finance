import { FinanceAction, FinanceState } from "../../types";
import { findDuplicateTransaction } from "../../lib/transactionDuplicates";
import {
  createInitialState,
  normalizeFinanceState,
  rememberTransactions,
  sortTransactionsByDate,
} from "./financeState";

export function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case "HYDRATE_STATE":
      return normalizeFinanceState(action.payload, createInitialState());
    case "ADD_TRANSACTION": {
      if (findDuplicateTransaction(action.payload, state.transactions)) {
        return state;
      }

      return {
        ...state,
        transactionMemory: rememberTransactions(state.transactionMemory, [action.payload]),
        transactions: sortTransactionsByDate([...state.transactions, action.payload]),
      };
    }
    case "UPDATE_TRANSACTION": {
      if (findDuplicateTransaction(action.payload, state.transactions, { ignoreId: action.payload.id })) {
        return state;
      }

      return {
        ...state,
        transactionMemory: rememberTransactions(state.transactionMemory, [action.payload]),
        transactions: sortTransactionsByDate(
          state.transactions.map((transaction) => (transaction.id === action.payload.id ? action.payload : transaction))
        ),
      };
    }
    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.payload),
      };
    case "SET_TRANSACTIONS":
      return {
        ...state,
        transactionMemory: rememberTransactions(state.transactionMemory, action.payload),
        transactions: sortTransactionsByDate(action.payload),
      };
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
