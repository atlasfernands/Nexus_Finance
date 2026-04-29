import { describe, expect, it } from "vitest";
import {
  buildCsvImportAiPromptTemplate,
  CSV_IMPORT_TEMPLATE_HEADER,
  ImportService,
} from "./import";
import { TransactionStatus, TransactionType } from "../types";

describe("ImportService", () => {
  it("classifies expense rows and preserves running balance metadata", () => {
    const result = ImportService.parseRows([
      {
        data: "01/04/2026",
        descricao: "Aluguel",
        categoria: "Moradia",
        tipo: "Saida",
        valor: "(R$ 700,00)",
        status: "Pago",
        saldo_acumulado: "(R$ 700,00)",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.EXPENSE);
    expect(result.transactions[0].amount).toBe(700);
    expect(result.transactions[0].runningBalance).toBe(-700);
    expect(result.transactions[0].sourceOrder).toBe(1);
    expect(result.transactions[0].status).toBe(TransactionStatus.PAID);
  });

  it("keeps entries marked as income and stores positive running balance", () => {
    const result = ImportService.parseRows([
      {
        data: "09/04/2026",
        descricao: "Saldo Inicial Loja",
        categoria: "Loja",
        tipo: "Entrada",
        valor: "R$ 2.084,06",
        status: "Realizado",
        saldo_acumulado: "R$ 2.130,06",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.INCOME);
    expect(result.transactions[0].amount).toBe(2084.06);
    expect(result.transactions[0].runningBalance).toBe(2130.06);
    expect(result.transactions[0].sourceOrder).toBe(1);
  });

  it("accepts the official template headers and received status", () => {
    const result = ImportService.parseRows([
      {
        Data: "12/04/2026",
        "Descrição": "Venda Pix Cliente",
        Categoria: "Vendas",
        Tipo: "Entrada",
        Valor: "R$ 320,50",
        Status: "Recebido",
        Subcategoria: "Loja",
        "Saldo Acumulado": "R$ 1.920,50",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.INCOME);
    expect(result.transactions[0].status).toBe(TransactionStatus.PAID);
    expect(result.transactions[0].amount).toBe(320.5);
    expect(result.transactions[0].runningBalance).toBe(1920.5);
  });

  it("builds an AI prompt aligned with the official CSV model", () => {
    const prompt = buildCsvImportAiPromptTemplate();

    expect(prompt).toContain(CSV_IMPORT_TEMPLATE_HEADER);
    expect(prompt).toContain("Responda somente com o conteudo bruto do CSV.");
    expect(prompt).toContain("Pendente, Pago ou Recebido");
    expect(prompt).toContain("Contas fixas de saida:");
    expect(prompt).toContain("Recebimentos fixos:");
  });
});
