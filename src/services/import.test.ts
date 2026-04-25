import { describe, expect, it } from "vitest";
import { ImportService } from "./import";
import { TransactionStatus, TransactionType } from "../types";

describe("ImportService", () => {
  it("classifies rows with 'Saída' and values in parentheses as expenses", () => {
    const processData = (ImportService as any).processData.bind(ImportService);

    const result = processData([
      {
        data: "01/04/2026",
        descricao: "Aluguel",
        categoria: "Moradia",
        tipo: "Saída",
        valor: "(R$ 700,00)",
        status: "Pago",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.EXPENSE);
    expect(result.transactions[0].amount).toBe(700);
    expect(result.transactions[0].status).toBe(TransactionStatus.PAID);
  });

  it("keeps entries marked as 'Entrada' as income", () => {
    const processData = (ImportService as any).processData.bind(ImportService);

    const result = processData([
      {
        data: "09/04/2026",
        descricao: "Saldo Inicial Loja",
        categoria: "Loja",
        tipo: "Entrada",
        valor: "R$ 2.084,06",
        status: "Realizado",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.INCOME);
    expect(result.transactions[0].amount).toBe(2084.06);
  });
});
