import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../../types";
import { formatCurrency } from "../../lib/utils";

export function formatTransactionTypeLabel(type: TransactionType) {
  return type === TransactionType.INCOME ? "Entrada" : "Saida";
}

export function formatTransactionStatusLabel(status: TransactionStatus) {
  if (status === TransactionStatus.PAID) {
    return "Pago";
  }

  if (status === TransactionStatus.PENDING) {
    return "Pendente";
  }

  if (status === TransactionStatus.CANCELLED) {
    return "Cancelado";
  }

  return "Realizado";
}

export function formatSignedCurrency(value: number, isNegative: boolean) {
  const formatted = formatCurrency(Math.abs(value));
  return isNegative ? `(${formatted})` : formatted;
}

export function createDefaultFormData(): Partial<Transaction> {
  return {
    description: "",
    amount: 0,
    type: TransactionType.EXPENSE,
    subcategory: TransactionSubcategory.HOME,
    status: TransactionStatus.PENDING,
    date: new Date().toLocaleDateString("pt-BR"),
    category: "Outros",
    recurring: false,
  };
}

function getMemoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function hasMemoryMatch(items: string[], value: string) {
  const key = getMemoryKey(value);

  return items.some((item) => getMemoryKey(item) === key);
}
