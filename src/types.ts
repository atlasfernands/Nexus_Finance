/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TransactionStatus {
  COMPLETED = "realizado",
  PENDING = "pendente",
  PAID = "pago",
  CANCELLED = "cancelado"
}

export enum TransactionType {
  INCOME = "entrada",
  EXPENSE = "saída"
}

export enum TransactionSubcategory {
  HOME = "Casa",
  STORE = "Loja"
}

export interface Transaction {
  id: string;
  date: string; // DD/MM/YYYY
  description: string;
  category: string;
  subcategory: TransactionSubcategory;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  recurring: boolean;
  notes?: string;
  tags?: string[];
}

export interface UserProfile {
  name: string;
  store: string;
  goal: number;
}

export interface UserPreferences {
  showCents: boolean;
  includePendingInBalance: boolean;
  enableAlerts: boolean;
  animations: boolean;
}

export type ReportingGranularity = "month" | "year";

export interface ReportingPeriod {
  month: number; // 0-11
  year: number;
  granularity: ReportingGranularity;
}

export interface FinanceState {
  transactions: Transaction[];
  profile: UserProfile;
  preferences: UserPreferences;
  reportingPeriod: ReportingPeriod;
  aiInsights: {
    lastAnalysis?: string;
    history: { date: string; content: string }[];
  };
}

export type FinanceAction =
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "SET_TRANSACTIONS"; payload: Transaction[] }
  | { type: "UPDATE_PROFILE"; payload: Partial<UserProfile> }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<UserPreferences> }
  | { type: "UPDATE_REPORTING_PERIOD"; payload: Partial<ReportingPeriod> }
  | { type: "ADD_AI_INSIGHT"; payload: string }
  | { type: "RESET_STATE" };
