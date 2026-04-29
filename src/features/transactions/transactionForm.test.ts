import { describe, expect, it } from "vitest";
import { TransactionStatus, TransactionType } from "../../types";
import { formatTransactionStatusLabel } from "./transactionForm";

describe("transactionForm status labels", () => {
  it("shows recebido for paid income entries", () => {
    expect(formatTransactionStatusLabel(TransactionStatus.PAID, TransactionType.INCOME)).toBe("Recebido");
  });

  it("shows pago for paid expense entries", () => {
    expect(formatTransactionStatusLabel(TransactionStatus.PAID, TransactionType.EXPENSE)).toBe("Pago");
  });

  it("keeps pending entries labeled as pendente", () => {
    expect(formatTransactionStatusLabel(TransactionStatus.PENDING, TransactionType.EXPENSE)).toBe("Pendente");
  });
});
