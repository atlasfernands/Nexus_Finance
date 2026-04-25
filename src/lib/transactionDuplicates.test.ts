import { describe, expect, it } from "vitest";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";
import {
  createTransactionFingerprint,
  findDuplicateTransaction,
  partitionTransactionsByDuplicates,
} from "./transactionDuplicates";

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    date: overrides.date ?? "10/04/2026",
    description: overrides.description ?? "Conta de Luz",
    category: overrides.category ?? "Moradia",
    subcategory: overrides.subcategory ?? TransactionSubcategory.HOME,
    type: overrides.type ?? TransactionType.EXPENSE,
    amount: overrides.amount ?? 180,
    status: overrides.status ?? TransactionStatus.PAID,
    recurring: overrides.recurring ?? false,
    runningBalance: overrides.runningBalance,
    sourceOrder: overrides.sourceOrder,
    notes: overrides.notes,
    tags: overrides.tags,
  };
}

describe("transactionDuplicates", () => {
  it("normalizes month, accents and casing in fingerprints", () => {
    const first = createTransaction({
      date: "10/04/2026",
      description: "Conta de Agua",
      category: "Casa",
    });
    const second = createTransaction({
      date: "2026-04-25",
      description: "  conta   de \u00e1gua  ",
      category: "CASA",
    });

    expect(createTransactionFingerprint(first)).toBe(createTransactionFingerprint(second));
  });

  it("allows equal lancamentos in different months", () => {
    const april = createTransaction({ date: "10/04/2026" });
    const may = createTransaction({ id: "tx-2", date: "10/05/2026" });

    expect(findDuplicateTransaction(may, [april], { ignoreId: may.id })).toBeNull();
  });

  it("detects duplicates against the current ledger while ignoring the edited id", () => {
    const existing = createTransaction({ id: "tx-1" });
    const edited = createTransaction({ id: "tx-1", status: TransactionStatus.COMPLETED });
    const conflicting = createTransaction({ id: "tx-2" });

    expect(findDuplicateTransaction(edited, [existing], { ignoreId: edited.id })).toBeNull();
    expect(findDuplicateTransaction(conflicting, [existing], { ignoreId: conflicting.id })).not.toBeNull();
  });

  it("filters duplicates already present in the ledger and repeated inside the same import batch", () => {
    const existing = createTransaction({ id: "existing-1", description: "Internet" });
    const imported = [
      createTransaction({ id: "import-1", description: "Internet" }),
      createTransaction({ id: "import-2", description: "Mercado", amount: 220 }),
      createTransaction({ id: "import-3", description: "Mercado", amount: 220 }),
    ];

    const result = partitionTransactionsByDuplicates(imported, [existing]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].description).toBe("Mercado");
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates.map((duplicate) => duplicate.source)).toEqual(["existing", "batch"]);
  });
});
