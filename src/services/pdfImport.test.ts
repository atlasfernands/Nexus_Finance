import { describe, expect, it } from "vitest";
import { parsePdfStatementText } from "./pdfImport";

describe("pdfImport", () => {
  it("converts Nubank PDF text lines into import rows", () => {
    const result = parsePdfStatementText(
      [
        "Nubank Extrato da conta",
        "Periodo 01/03/2026 a 31/03/2026",
        "13/03/2026 Transferencia recebida pelo Pix - ROBERTA FRAGOSO R$ 98,82",
        "13/03/2026 Transferencia enviada pelo Pix - SHPP BRASIL R$ 98,82",
        "17/03/2026 Compra no debito - POSTO TREVO -R$ 66,00",
      ].join("\n"),
      "NU_579646355_01MAR2026_31MAR2026.pdf"
    );

    expect(result.warnings).toContain("PDF processado localmente no navegador; o arquivo nao foi enviado para servidores.");
    expect(result.rawRows).toHaveLength(3);
    expect(result.rawRows[0]).toMatchObject({
      Data: "13/03/2026",
      Valor: "98.82",
      Descricao: "Transferencia recebida pelo Pix - ROBERTA FRAGOSO",
    });
    expect(result.rawRows[1]).toMatchObject({
      Data: "13/03/2026",
      Valor: "-98.82",
      Descricao: "Transferencia enviada pelo Pix - SHPP BRASIL",
    });
    expect(result.rawRows[2]).toMatchObject({
      Data: "17/03/2026",
      Valor: "-66.00",
      Descricao: "Compra no debito - POSTO TREVO",
    });
  });

  it("handles wrapped Nubank PDF transactions", () => {
    const result = parsePdfStatementText(
      [
        "Nu Pagamentos S.A.",
        "20/03/2026",
        "Transferencia Recebida - BCO MERCANTIL DO BRASIL S.A.",
        "R$ 2.254,11",
        "20/03/2026",
        "Pagamento de fatura",
        "R$ 76,74",
      ].join("\n"),
      "extrato-nubank-2026.pdf"
    );

    expect(result.rawRows).toHaveLength(2);
    expect(result.rawRows[0]).toMatchObject({
      Data: "20/03/2026",
      Valor: "2254.11",
      Descricao: "Transferencia Recebida - BCO MERCANTIL DO BRASIL S.A.",
    });
    expect(result.rawRows[1]).toMatchObject({
      Data: "20/03/2026",
      Valor: "-76.74",
      Descricao: "Pagamento de fatura",
    });
  });

  it("rejects image-only PDFs without selectable text", () => {
    expect(() => parsePdfStatementText("Nubank")).toThrow("PDF nao tem texto selecionavel suficiente");
  });

  it("rejects unsupported bank layouts for now", () => {
    expect(() =>
      parsePdfStatementText(
        "Banco Exemplo\n01/03/2026 Compra padaria R$ 10,00\n02/03/2026 Salario R$ 100,00",
        "banco-exemplo.pdf"
      )
    ).toThrow("PDF ainda nao reconhecido");
  });
});
