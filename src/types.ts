/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionStatus = "realizado" | "pendente" | "pago" | "cancelado";
export type TransactionType = "entrada" | "saída";
export type TransactionSubcategory = "Casa" | "Loja";

export interface Transaction {
  id: string;
  data: string; // DD/MM/YYYY
  descricao: string;
  categoria: string;
  subcategoria: TransactionSubcategory;
  tipo: TransactionType;
  valor: number;
  status: TransactionStatus;
  recorrente: boolean;
  observacoes?: string;
  tags?: string[];
}

export interface UserProfile {
  nome: string;
  loja: string;
  meta: number;
}

export interface UserPreferences {
  mostrarCentavos: boolean;
  incluirPendentesNoSaldo: boolean;
  ativarAlertas: boolean;
  animacoes: boolean;
}

export interface FinanceState {
  transactions: Transaction[];
  profile: UserProfile;
  preferences: UserPreferences;
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
  | { type: "ADD_AI_INSIGHT"; payload: string }
  | { type: "RESET_STATE" };
