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

  it("accepts Nubank statement rows and infers type from signed values", () => {
    const result = ImportService.parseRows([
      {
        Data: "13/03/2026",
        Valor: "98.82",
        Identificador: "69b38454-7e69-4a40-a632-3bd5b6fc53b8",
        "Descrição": "Transferência recebida pelo Pix - ROBERTA FRAGOSO",
      },
      {
        Data: "13/03/2026",
        Valor: "-98.82",
        Identificador: "69b38475-75a3-4b0d-beee-1c3b431c747f",
        "Descrição": "Transferência enviada pelo Pix - SHPP BRASIL",
      },
      {
        Data: "17/03/2026",
        Valor: "33.85",
        Identificador: "69b9961f-e862-42d3-bb1b-228c6794faae",
        "Descrição": "Estorno - Transferência enviada pelo Pix - POSTO TREVO",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain("Formato Nubank detectado: entradas e saidas foram inferidas pelo sinal do valor.");
    expect(result.warnings).not.toContain("Algumas datas podem estar em formato incorreto");
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0].type).toBe(TransactionType.INCOME);
    expect(result.transactions[0].amount).toBe(98.82);
    expect(result.transactions[0].category).toBe("Pix Recebido");
    expect(result.transactions[0].notes).toContain("69b38454");
    expect(result.transactions[0].tags).toContain("nubank");
    expect(result.transactions[1].type).toBe(TransactionType.EXPENSE);
    expect(result.transactions[1].amount).toBe(98.82);
    expect(result.transactions[1].category).toBe("Pix Enviado");
    expect(result.transactions[2].category).toBe("Estornos Nubank");
  });

  it("repairs mojibake in Nubank headers and descriptions", () => {
    const result = ImportService.parseRows([
      {
        Data: "17/03/2026",
        Valor: "-66.00",
        Identificador: "69b99b21-346b-49eb-8bdb-148a27cc842e",
        "DescriÃ§Ã£o": "Compra no dÃ©bito - POSTO TREVO ERMITAGE",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe("Compra no débito - POSTO TREVO ERMITAGE");
    expect(result.transactions[0].type).toBe(TransactionType.EXPENSE);
    expect(result.transactions[0].category).toBe("Compras no Debito");
    expect(result.transactions[0].status).toBe(TransactionStatus.PAID);
  });

  it("builds an AI prompt aligned with the official CSV model", () => {
    const prompt = buildCsvImportAiPromptTemplate();

    expect(prompt).toContain(CSV_IMPORT_TEMPLATE_HEADER);
    expect(prompt).toContain("crie um arquivo CSV completo");
    expect(prompt).toContain("conteudo de um arquivo CSV valido");
    expect(prompt).toContain("Pendente, Pago ou Recebido");
    expect(prompt).toContain("Contas fixas de saida:");
    expect(prompt).toContain("Recebimentos fixos:");
  });
});
