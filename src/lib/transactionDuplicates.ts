import { Transaction } from "../types";
import { formatCurrency, parseDateString } from "./utils";

export type DuplicateTransactionSource = "existing" | "batch";

export interface DuplicateTransactionMatch {
  duplicateOf: Transaction;
  fingerprint: string;
  source: DuplicateTransactionSource;
  transaction: Transaction;
}

export interface DuplicateTransactionPartition {
  accepted: Transaction[];
  duplicates: DuplicateTransactionMatch[];
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMonth(value: string) {
  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateMatch) {
    const [, year, month] = isoDateMatch;
    return `${year}-${month}`;
  }

  const parsedDate = parseDateString(value);

  if (!parsedDate) {
    return normalizeText(value);
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function normalizeAmount(value: number) {
  const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100;
  return roundedValue.toFixed(2);
}

export function createTransactionFingerprint(
  transaction: Pick<Transaction, "amount" | "category" | "date" | "description" | "subcategory" | "type">
) {
  return [
    normalizeMonth(transaction.date),
    normalizeText(transaction.description),
    normalizeText(transaction.category),
    normalizeText(transaction.subcategory),
    normalizeText(transaction.type),
    normalizeAmount(transaction.amount),
  ].join("|");
}

export function findDuplicateTransaction(
  transaction: Transaction,
  transactions: Transaction[],
  options?: { ignoreId?: string }
): DuplicateTransactionMatch | null {
  const fingerprint = createTransactionFingerprint(transaction);
  const duplicateOf = transactions.find((candidate) => {
    if (options?.ignoreId && candidate.id === options.ignoreId) {
      return false;
    }

    return createTransactionFingerprint(candidate) === fingerprint;
  });

  if (!duplicateOf) {
    return null;
  }

  return {
    duplicateOf,
    fingerprint,
    source: "existing",
    transaction,
  };
}

export function partitionTransactionsByDuplicates(
  transactions: Transaction[],
  existingTransactions: Transaction[] = []
): DuplicateTransactionPartition {
  const accepted: Transaction[] = [];
  const duplicates: DuplicateTransactionMatch[] = [];
  const existingFingerprints = new Map<string, Transaction>();
  const batchFingerprints = new Map<string, Transaction>();

  existingTransactions.forEach((transaction) => {
    const fingerprint = createTransactionFingerprint(transaction);

    if (!existingFingerprints.has(fingerprint)) {
      existingFingerprints.set(fingerprint, transaction);
    }
  });

  transactions.forEach((transaction) => {
    const fingerprint = createTransactionFingerprint(transaction);
    const existingMatch = existingFingerprints.get(fingerprint);

    if (existingMatch) {
      duplicates.push({
        duplicateOf: existingMatch,
        fingerprint,
        source: "existing",
        transaction,
      });
      return;
    }

    const batchMatch = batchFingerprints.get(fingerprint);

    if (batchMatch) {
      duplicates.push({
        duplicateOf: batchMatch,
        fingerprint,
        source: "batch",
        transaction,
      });
      return;
    }

    accepted.push(transaction);
    batchFingerprints.set(fingerprint, transaction);
  });

  return { accepted, duplicates };
}

export function buildDuplicateTransactionMessage(match: DuplicateTransactionMatch) {
  return `Ja existe um lancamento igual: "${match.duplicateOf.description}" em ${match.duplicateOf.date} no valor de ${formatCurrency(match.duplicateOf.amount)}. Revise os dados antes de salvar.`;
}
