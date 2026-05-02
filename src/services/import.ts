import Papa from "papaparse";
import { generateId, parseDateString } from "../lib/utils";
import { calculateRunningBalances } from "../lib/transactionLedger";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";
import { parsePdfFile } from "./pdfImport";

export type RawImportCell = string | number | boolean | Date | null | undefined;
export type RawImportRow = Record<string, RawImportCell>;
type CsvRow = RawImportCell[];

export interface ImportResult {
  transactions: Transaction[];
  errors: string[];
  warnings: string[];
}

export interface ColumnMapping {
  descricao: string;
  valor: string;
  data: string;
  categoria?: string;
  identificador?: string;
  saldoAcumulado?: string;
  tipo?: string;
  subcategoria?: string;
  status?: string;
}

export const CSV_IMPORT_TEMPLATE_DOWNLOAD_URL = "/modelo-importacao-nexus-finance.csv";
export const CSV_IMPORT_TEMPLATE_HEADER = "data,descricao,categoria,tipo,valor,status,subcategoria,saldo_acumulado";
export const CSV_IMPORT_TEMPLATE_SAMPLE_ROWS = [
  "01/04/2026,Salario principal,Receitas,Entrada,3500.00,Recebido,Casa,3500.00",
  "03/04/2026,Conta de luz Abril,Moradia,Saida,189.90,Pago,Casa,3310.10",
  "05/04/2026,Internet Loja,Operacao Loja,Saida,129.90,Pendente,Loja,3180.20",
] as const;

export const CSV_IMPORT_TEMPLATE_COLUMNS = [
  {
    key: "data",
    required: true,
    description: "Data do lancamento",
    acceptedValues: "DD/MM/YYYY",
    example: "28/04/2026",
  },
  {
    key: "descricao",
    required: true,
    description: "Nome unitario do lancamento",
    acceptedValues: "Ex.: Conta de luz Abril",
    example: "Conta de luz Abril",
  },
  {
    key: "categoria",
    required: true,
    description: "Grupo abrangente para relatorios",
    acceptedValues: "Ex.: Moradia, Alimentacao, Vendas",
    example: "Moradia",
  },
  {
    key: "tipo",
    required: true,
    description: "Direcao financeira",
    acceptedValues: "Entrada ou Saida",
    example: "Saida",
  },
  {
    key: "valor",
    required: true,
    description: "Valor monetario",
    acceptedValues: "189.90, 189,90, R$ 189,90 ou (R$ 189,90)",
    example: "189.90",
  },
  {
    key: "status",
    required: true,
    description: "Situacao do lancamento",
    acceptedValues: "Pendente, Pago ou Recebido",
    example: "Pendente",
  },
  {
    key: "subcategoria",
    required: false,
    description: "Contexto do modulo",
    acceptedValues: "Casa ou Loja",
    example: "Casa",
  },
  {
    key: "saldo_acumulado",
    required: false,
    description: "Saldo logo apos o lancamento",
    acceptedValues: "3810.10 ou R$ 3.810,10",
    example: "3810.10",
  },
] as const;

export function buildCsvImportAiPromptTemplate() {
  const csvExample = [CSV_IMPORT_TEMPLATE_HEADER, ...CSV_IMPORT_TEMPLATE_SAMPLE_ROWS].join("\n");

  return [
    "Quero que voce crie um arquivo CSV completo e pronto para importar no Nexus Finance.",
    "",
    "Regras obrigatorias:",
    "1. Sua resposta final deve ser o conteudo de um arquivo CSV valido.",
    "2. Responda somente com o conteudo bruto do CSV.",
    "3. Nao use markdown, bloco de codigo, explicacoes, titulos ou comentarios.",
    "4. O resultado precisa poder ser salvo diretamente como um arquivo .csv e importado no app sem ajustes manuais.",
    `5. Use exatamente este cabecalho: ${CSV_IMPORT_TEMPLATE_HEADER}`,
    "6. Datas devem ficar em DD/MM/YYYY.",
    "7. Em tipo, use apenas Entrada ou Saida.",
    "8. Em status, use apenas Pendente, Pago ou Recebido.",
    "9. Em subcategoria, use apenas Casa ou Loja.",
    "10. Em valor e saldo_acumulado, use ponto decimal e nao use simbolo de moeda.",
    "11. Se eu nao informar saldo_acumulado, calcule linha a linha e preencha a coluna.",
    "12. Categoria e o grupo abrangente. Descricao e o nome unitario da conta ou recebimento.",
    "13. Se eu estiver usando uma IA no celular, mantenha a resposta curta e entregue apenas o CSV final.",
    "",
    "Periodo que quero montar:",
    "[mes/ano ou intervalo desejado]",
    "",
    "Contas fixas de saida:",
    "- [dia] | [descricao] | [categoria] | [valor] | [status inicial: Pendente ou Pago] | [subcategoria: Casa ou Loja]",
    "- [dia] | [descricao] | [categoria] | [valor] | [status inicial: Pendente ou Pago] | [subcategoria: Casa ou Loja]",
    "",
    "Recebimentos fixos:",
    "- [dia] | [descricao] | [categoria] | [valor] | [status inicial: Recebido ou Pendente] | [subcategoria: Casa ou Loja]",
    "- [dia] | [descricao] | [categoria] | [valor] | [status inicial: Recebido ou Pendente] | [subcategoria: Casa ou Loja]",
    "",
    "Movimentos extras do periodo:",
    "- [data completa] | [descricao] | [categoria] | [tipo] | [valor] | [status] | [subcategoria]",
    "",
    "Se alguma categoria nao for informada, use Outros.",
    "",
    "Exemplo exato do formato esperado:",
    csvExample,
  ].join("\n");
}

export class ImportService {
  private static readonly DEFAULT_MAPPING: ColumnMapping = {
    descricao: "descricao",
    valor: "valor",
    data: "data",
    categoria: "categoria",
    saldoAcumulado: "saldo_acumulado",
    tipo: "tipo",
    subcategoria: "subcategoria",
    status: "status",
  };

  private static readonly COMMON_HEADERS = {
    descricao: ["descricao", "description", "nome", "name", "titulo", "title", "produto", "product"],
    valor: ["valor", "value", "amount", "preco", "price", "total", "montante", "valor (r$)"],
    data: ["data", "date", "dt", "data_compra", "purchase_date"],
    categoria: ["categoria", "category", "tipo", "type", "classificacao"],
    identificador: ["identificador", "nubank_id", "nubank id", "identifier", "transaction id", "transaction_id"],
    saldoAcumulado: ["saldo_acumulado", "saldo acumulado", "running_balance", "balance", "saldo"],
    tipo: ["tipo", "type", "operacao", "operation", "movimento", "tipo\n(entrada/saida)"],
    subcategoria: ["subcategoria", "subcategory", "sistema", "system"],
    status: ["status", "estado", "state", "situacao"],
  };

  private static readonly WINDOWS_1252_REVERSE_MAP: Record<string, number> = {
    "€": 0x80,
    "‚": 0x82,
    "ƒ": 0x83,
    "„": 0x84,
    "…": 0x85,
    "†": 0x86,
    "‡": 0x87,
    "ˆ": 0x88,
    "‰": 0x89,
    "Š": 0x8a,
    "‹": 0x8b,
    "Œ": 0x8c,
    "Ž": 0x8e,
    "‘": 0x91,
    "’": 0x92,
    "“": 0x93,
    "”": 0x94,
    "•": 0x95,
    "–": 0x96,
    "—": 0x97,
    "˜": 0x98,
    "™": 0x99,
    "š": 0x9a,
    "›": 0x9b,
    "œ": 0x9c,
    "ž": 0x9e,
    "Ÿ": 0x9f,
  };

  static async parseFile(file: File): Promise<ImportResult> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "pdf") {
      const pdfResult = await parsePdfFile(file);
      const importResult = this.processData(pdfResult.rawRows);

      return {
        ...importResult,
        warnings: [...pdfResult.warnings, ...importResult.warnings],
      };
    }

    if (extension !== "csv") {
      throw new Error("Formato de arquivo nao suportado. Use CSV ou PDF.");
    }

    const rawData = await this.parseCSV(file);
    return this.processData(rawData);
  }

  static parseRows(rawData: RawImportRow[]): ImportResult {
    return this.processData(rawData);
  }

  private static parseCSV(file: File): Promise<RawImportRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRow>(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(this.buildRawRowsFromCsv(results.data));
        },
        error: (error) => {
          reject(new Error(`Erro ao processar CSV: ${error.message}`));
        },
      });
    });
  }

  private static buildRawRowsFromCsv(rows: CsvRow[]): RawImportRow[] {
    const cleanedRows = rows.filter((row): row is CsvRow => this.isMeaningfulCsvRow(row));

    if (cleanedRows.length === 0) {
      return [];
    }

    const headerRowIndex = cleanedRows.findIndex((row, index) => index < 4 && this.isHeaderRow(row));

    if (headerRowIndex >= 0) {
      const headers = cleanedRows[headerRowIndex].map((cell, index) => {
        const value = this.repairMojibake(String(cell ?? "")).trim().replace(/\s+/g, " ");
        return value !== "" ? value : `col_${index + 1}`;
      });

      return cleanedRows
        .slice(headerRowIndex + 1)
        .filter((row) => this.hasRowContent(row))
        .map((row) => this.createRawImportRow(row, headers));
    }

    const transactionRows = cleanedRows.filter((row) => this.isLikelyTransactionRow(row));

    if (transactionRows.length === 0) {
      return [];
    }

    const headers = this.inferHeadersFromData(transactionRows[0]);
    return transactionRows.map((row) => this.createRawImportRow(row, headers));
  }

  private static inferHeadersFromData(sampleRow: CsvRow): string[] {
    const headers = ["data", "descricao", "categoria", "tipo", "valor", "status", "subcategoria", "saldo_acumulado"];

    if (sampleRow.length >= 8) {
      return headers;
    }

    if (sampleRow.length >= 7) {
      return headers.slice(0, 7);
    }

    if (sampleRow.length >= 6) {
      return ["data", "descricao", "categoria", "tipo", "valor", "status"];
    }

    return sampleRow.map((_, index) => `col_${index + 1}`);
  }

  private static createRawImportRow(row: CsvRow, headers: string[]): RawImportRow {
    return headers.reduce<RawImportRow>((rawRow, header, index) => {
      rawRow[header] = row[index] ?? "";
      return rawRow;
    }, {});
  }

  private static countMojibakeMarkers(value: string): number {
    return (value.match(/Ã|Â|â€|â€¢|ï¿½|�/g) ?? []).length;
  }

  private static repairMojibake(value: string): string {
    if (!/[ÃÂâï�]/.test(value)) {
      return value;
    }

    try {
      const bytes = Uint8Array.from(Array.from(value), (char) => {
        const mappedByte = this.WINDOWS_1252_REVERSE_MAP[char];
        if (mappedByte !== undefined) {
          return mappedByte;
        }

        const codePoint = char.codePointAt(0) ?? 0;
        return codePoint <= 0xff ? codePoint : 0x3f;
      });
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

      if (decoded.includes("�")) {
        return value;
      }

      return this.countMojibakeMarkers(decoded) < this.countMojibakeMarkers(value) ? decoded : value;
    } catch {
      return value;
    }
  }

  private static normalizeComparisonText(value: string): string {
    return this.repairMojibake(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static hasRowContent(row: CsvRow): boolean {
    return row.some((cell) => String(cell ?? "").trim() !== "");
  }

  private static isMeaningfulCsvRow(row: RawImportCell[] | undefined): row is CsvRow {
    if (!Array.isArray(row) || row.length === 0 || !this.hasRowContent(row)) {
      return false;
    }

    const rowText = row.join(" ").toLowerCase();
    if (rowText.includes("controle financeiro") || rowText.includes("lancamentos") || rowText.includes("ðŸ“‹")) {
      return false;
    }

    return true;
  }

  private static isLikelyTransactionRow(row: CsvRow): boolean {
    if (row.length < 3) {
      return false;
    }

    const firstCol = String(row[0] ?? "").trim();
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{1,2}-\d{1,2}-\d{4}$/,
      /^\d{4}\/\d{1,2}\/\d{1,2}$/,
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^\d{1,2}\/\d{1,2}\/\d{2}$/,
    ];

    return datePatterns.some((pattern) => pattern.test(firstCol));
  }

  private static isHeaderRow(row: CsvRow): boolean {
    const normalizedCells = row
      .map((cell) => this.normalizeComparisonText(String(cell ?? "")))
      .filter((cell) => cell !== "");

    if (normalizedCells.length < 3) {
      return false;
    }

    const matches = normalizedCells.filter((cell) =>
      Object.values(this.COMMON_HEADERS).some((possibleHeaders) =>
        possibleHeaders.some((possibleHeader) => {
          const normalizedHeader = this.normalizeComparisonText(possibleHeader);
          return (
            cell === normalizedHeader ||
            cell.includes(normalizedHeader) ||
            normalizedHeader.includes(cell)
          );
        })
      )
    ).length;

    return (
      matches >= 3 &&
      normalizedCells.some((cell) => cell.includes("data") || cell === "date") &&
      normalizedCells.some((cell) => cell.includes("descr") || cell.includes("description")) &&
      normalizedCells.some(
        (cell) => cell.includes("valor") || cell.includes("amount") || cell.includes("price")
      )
    );
  }

  private static processData(rawData: RawImportRow[]): ImportResult {
    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rawData.length === 0) {
      errors.push("Arquivo vazio ou sem dados validos");
      return { transactions, errors, warnings };
    }

    const mapping = this.detectColumnMapping(rawData[0]);
    const isNubankStatement = rawData.some((row) => this.isNubankStatementRow(row, mapping));

    if (isNubankStatement) {
      warnings.push("Formato Nubank detectado: entradas e saidas foram inferidas pelo sinal do valor.");
    }

    rawData.forEach((row, index) => {
      try {
        const transaction = this.mapRowToTransaction(row, mapping, index + 1);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        errors.push(`Linha ${index + 1}: ${error}`);
      }
    });

    const hadMissingRunningBalances = transactions.some(
      (transaction) => typeof transaction.runningBalance !== "number"
    );
    const sortedTransactions = calculateRunningBalances(transactions, {
      preserveExisting: true,
    });

    if (
      sortedTransactions.length > 1 &&
      sortedTransactions.some((transaction, index) => transaction.id !== transactions[index]?.id)
    ) {
      warnings.push("Lancamentos reordenados automaticamente pela data correta do arquivo");
    }

    if (sortedTransactions.length > 0) {
      const hasInvalidDates = sortedTransactions.some((transaction) => !this.isValidDate(transaction.date));
      if (hasInvalidDates) {
        warnings.push("Algumas datas podem estar em formato incorreto");
      }

      const hasZeroValues = sortedTransactions.some((transaction) => transaction.amount === 0);
      if (hasZeroValues) {
        warnings.push("Algumas transacoes tem valor zero");
      }

      if (hadMissingRunningBalances) {
        warnings.push("Saldos acumulados calculados automaticamente para as linhas sem saldo no arquivo");
      }
    }

    return { transactions: sortedTransactions, errors, warnings };
  }

  private static detectColumnMapping(sampleRow: RawImportRow): ColumnMapping {
    const mapping = { ...this.DEFAULT_MAPPING };
    const headerEntries = Object.keys(sampleRow).map((header) => ({
      original: header,
      normalized: this.normalizeComparisonText(header),
    }));

    for (const [field, possibleHeaders] of Object.entries(this.COMMON_HEADERS)) {
      for (const header of headerEntries) {
        if (
          possibleHeaders.some((possibleHeader) => {
            const normalizedHeader = this.normalizeComparisonText(possibleHeader);
            return (
              header.normalized.includes(normalizedHeader) ||
              normalizedHeader.includes(header.normalized)
            );
          })
        ) {
          mapping[field as keyof ColumnMapping] = header.original;
          break;
        }
      }
    }

    return mapping;
  }

  private static isNubankStatementRow(row: RawImportRow, mapping: ColumnMapping): boolean {
    const identifierHeader = this.normalizeComparisonText(mapping.identificador ?? "");
    const isNubankIdentifierHeader = identifierHeader === "identificador" || identifierHeader.includes("nubank");

    return Boolean(
      isNubankIdentifierHeader &&
        this.extractStringValue(row, mapping.identificador) &&
        this.extractStringValue(row, mapping.data) &&
        this.extractStringValue(row, mapping.descricao) &&
        this.extractNumericValue(row, mapping.valor) !== null
    );
  }

  private static inferImportedCategory(
    description: string,
    type: TransactionType,
    isNubankStatement: boolean
  ): string {
    if (!isNubankStatement) {
      return "Importado";
    }

    const normalizedDescription = this.normalizeComparisonText(description);

    if (normalizedDescription.includes("estorno")) {
      return "Estornos Nubank";
    }

    if (normalizedDescription.includes("pagamento de fatura")) {
      return "Cartao Nubank";
    }

    if (normalizedDescription.includes("compra no debito")) {
      return "Compras no Debito";
    }

    if (type === TransactionType.INCOME && normalizedDescription.includes("credito em conta")) {
      return "Creditos Nubank";
    }

    if (type === TransactionType.INCOME && normalizedDescription.includes("pix")) {
      return "Pix Recebido";
    }

    if (type === TransactionType.EXPENSE && normalizedDescription.includes("pix")) {
      return "Pix Enviado";
    }

    if (type === TransactionType.INCOME && normalizedDescription.includes("transferencia recebida")) {
      return "Transferencias Recebidas";
    }

    if (type === TransactionType.EXPENSE && normalizedDescription.includes("transferencia enviada")) {
      return "Transferencias Enviadas";
    }

    return "Nubank";
  }

  private static mapRowToTransaction(row: RawImportRow, mapping: ColumnMapping, rowNumber: number): Transaction | null {
    const descricao = this.extractStringValue(row, mapping.descricao);
    const valorRaw = this.extractNumericValue(row, mapping.valor);
    const dataRaw = this.extractStringValue(row, mapping.data);
    const categoriaRaw = this.extractStringValue(row, mapping.categoria);
    const identificador = this.extractStringValue(row, mapping.identificador);
    const isNubankStatement = this.isNubankStatementRow(row, mapping);
    const saldoAcumuladoRaw = this.extractNumericValue(row, mapping.saldoAcumulado ?? "saldo_acumulado");
    const tipoRaw = this.extractStringValue(row, mapping.tipo);
    const subcategoriaRaw = this.extractStringValue(row, mapping.subcategoria);
    const statusRaw = this.extractStringValue(row, mapping.status);
    const statusLower = this.normalizeComparisonText(statusRaw ?? "");

    if (!descricao) {
      throw new Error("Descricao obrigatoria nao encontrada");
    }

    if (valorRaw === null || Number.isNaN(valorRaw)) {
      throw new Error("Valor numerico obrigatorio nao encontrado");
    }

    const data = this.normalizeDate(dataRaw);
    if (!data) {
      throw new Error(`Data invalida: ${dataRaw}`);
    }

    let tipo: TransactionType = TransactionType.EXPENSE;
    if (tipoRaw) {
      const tipoLower = this.normalizeComparisonText(tipoRaw);
      if (
        tipoLower.includes("entrada") ||
        tipoLower.includes("income") ||
        tipoLower.includes("recebimento") ||
        tipoLower.includes("recebido") ||
        tipoLower.includes("received") ||
        tipoLower.includes("credito") ||
        tipoLower.includes("renda")
      ) {
        tipo = TransactionType.INCOME;
      } else if (
        tipoLower.includes("saida") ||
        tipoLower.includes("expense") ||
        tipoLower.includes("pagamento") ||
        tipoLower.includes("pago") ||
        tipoLower.includes("paid") ||
        tipoLower.includes("debito") ||
        tipoLower.includes("despesa")
      ) {
        tipo = TransactionType.EXPENSE;
      } else if (statusLower.includes("recebido") || statusLower.includes("received")) {
        tipo = TransactionType.INCOME;
      } else if (statusLower.includes("pago") || statusLower.includes("paid")) {
        tipo = TransactionType.EXPENSE;
      } else if (valorRaw < 0) {
        tipo = TransactionType.EXPENSE;
      } else if (valorRaw > 0) {
        tipo = TransactionType.INCOME;
      }
    } else if (statusLower.includes("recebido") || statusLower.includes("received")) {
      tipo = TransactionType.INCOME;
    } else if (statusLower.includes("pago") || statusLower.includes("paid")) {
      tipo = TransactionType.EXPENSE;
    } else {
      tipo = valorRaw >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
    }

    const categoria = categoriaRaw || this.inferImportedCategory(descricao, tipo, isNubankStatement);

    let subcategoria: TransactionSubcategory = TransactionSubcategory.HOME;
    if (subcategoriaRaw) {
      const subLower = this.normalizeComparisonText(subcategoriaRaw);
      if (subLower.includes("loja") || subLower.includes("store") || subLower.includes("mei")) {
        subcategoria = TransactionSubcategory.STORE;
      }
    } else if (categoria) {
      const catLower = this.normalizeComparisonText(categoria);
      if (catLower.includes("loja - vendas") || catLower.includes("loja - estoque")) {
        subcategoria = TransactionSubcategory.STORE;
      } else if (catLower.includes("moradia") || catLower.includes("aluguel")) {
        subcategoria = TransactionSubcategory.HOME;
      }
    }

    let status: Transaction["status"] = TransactionStatus.PAID;
    if (statusRaw) {
      if (statusLower.includes("pendente") || statusLower.includes("pending") || statusLower.includes("nao pago")) {
        status = TransactionStatus.PENDING;
      } else if (statusLower.includes("cancelado") || statusLower.includes("cancelled")) {
        status = TransactionStatus.CANCELLED;
      } else if (
        statusLower.includes("pago") ||
        statusLower.includes("paid") ||
        statusLower.includes("recebido") ||
        statusLower.includes("received") ||
        statusLower.includes("confirmado") ||
        statusLower.includes("completed") ||
        statusLower.includes("realizado") ||
        statusLower.includes("feito")
      ) {
        status = TransactionStatus.PAID;
      }
    }

    return {
      id: generateId(),
      date: data,
      description: descricao,
      category: categoria,
      subcategory: subcategoria,
      type: tipo,
      amount: Math.abs(valorRaw),
      runningBalance: saldoAcumuladoRaw ?? undefined,
      status,
      recurring: false,
      sourceOrder: rowNumber,
      notes: isNubankStatement && identificador ? `ID Nubank: ${identificador}` : undefined,
      tags: isNubankStatement && identificador ? ["nubank", `nubank:${identificador}`] : undefined,
    };
  }

  private static extractStringValue(row: RawImportRow, field: string | undefined): string | undefined {
    if (!field) {
      return undefined;
    }

    const value = row[field];
    if (value === null || value === undefined) {
      return undefined;
    }

    return this.repairMojibake(String(value)).trim();
  }

  private static extractNumericValue(row: RawImportRow, field: string | undefined): number | null {
    if (!field) {
      return null;
    }

    const value = row[field];
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const rawValue = String(value).trim();
    const isNegativeByParentheses = rawValue.includes("(") && rawValue.includes(")");

    let cleaned = rawValue;
    cleaned = cleaned.replace(/[()]/g, "").replace(/R\$\s*/g, "").replace(/\s+/g, "");
    cleaned = cleaned.replace(/[^\d.,-]/g, "");

    const hasDot = cleaned.includes(".");
    const hasComma = cleaned.includes(",");

    if (hasDot && hasComma) {
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");

      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, "");
        cleaned = cleaned.replace(/,/, ".");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (hasComma) {
      cleaned = cleaned.replace(/,/, ".");
    }

    cleaned = cleaned.replace(/[^\d.\-]/g, "");

    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return isNegativeByParentheses ? -Math.abs(parsed) : parsed;
  }

  private static normalizeDate(dateStr: string): string | null {
    if (!dateStr) {
      return null;
    }

    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (!match) {
        continue;
      }

      let day: string;
      let month: string;
      let year: string;

      if (format === formats[0] || format === formats[1]) {
        [, day, month, year] = match;
      } else if (format === formats[2] || format === formats[3]) {
        [, year, month, day] = match;
      } else {
        [, day, month, year] = match;
        year = `20${year}`;
      }

      const parsedDate = new Date(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10)
      );
      if (this.isValidDate(parsedDate)) {
        return parsedDate.toLocaleDateString("pt-BR");
      }
    }

    const fallbackDate = new Date(dateStr);
    if (this.isValidDate(fallbackDate)) {
      return fallbackDate.toLocaleDateString("pt-BR");
    }

    return null;
  }

  private static isValidDate(date: Date | string): boolean {
    if (typeof date === "string") {
      return parseDateString(date) !== null;
    }

    return !Number.isNaN(date.getTime());
  }
}
