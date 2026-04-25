import Papa from "papaparse";
import * as XLSX from "xlsx";
import { compareDateStrings, generateId } from "../lib/utils";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";

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
  tipo?: string;
  subcategoria?: string;
  status?: string;
}

export class ImportService {
  private static readonly DEFAULT_MAPPING: ColumnMapping = {
    descricao: "descricao",
    valor: "valor",
    data: "data",
    categoria: "categoria",
    tipo: "tipo",
    subcategoria: "subcategoria",
    status: "status",
  };

  private static readonly COMMON_HEADERS = {
    descricao: ["descricao", "description", "nome", "name", "titulo", "title", "produto", "product"],
    valor: ["valor", "value", "amount", "preco", "price", "total", "montante", "valor (r$)"],
    data: ["data", "date", "dt", "data_compra", "purchase_date"],
    categoria: ["categoria", "category", "tipo", "type", "classificacao"],
    tipo: ["tipo", "type", "operacao", "operation", "movimento", "tipo\n(entrada/saida)"],
    subcategoria: ["subcategoria", "subcategory", "sistema", "system"],
    status: ["status", "estado", "state", "situacao"],
  };

  static async parseFile(file: File): Promise<ImportResult> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    let rawData: any[] = [];

    if (extension === "csv") {
      rawData = await this.parseCSV(file);
    } else if (extension === "xlsx" || extension === "xls") {
      rawData = await this.parseExcel(file);
    } else {
      throw new Error("Formato de arquivo nao suportado. Use CSV ou XLSX.");
    }

    return this.processData(rawData);
  }

  private static parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          let data = results.data as any[];

          data = data.filter((row: any) => {
            if (!Array.isArray(row) || row.length === 0) {
              return false;
            }

            const rowText = row.join(" ").toLowerCase();
            if (
              rowText.includes("controle financeiro") ||
              rowText.includes("lancamentos") ||
              rowText.includes("📋")
            ) {
              return false;
            }

            if (row.length < 3) {
              return false;
            }

            const firstCol = String(row[0] || "").trim();
            const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            return datePattern.test(firstCol);
          });

          if (data.length > 0) {
            const sampleRow = data[0];
            const headers = this.inferHeadersFromData(sampleRow);

            data = data.map((row: any) => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || "";
              });
              return obj;
            });
          }

          resolve(data);
        },
        error: (error) => {
          reject(new Error(`Erro ao processar CSV: ${error.message}`));
        },
      });
    });
  }

  private static inferHeadersFromData(sampleRow: any[]): string[] {
    const headers = ["data", "descricao", "categoria", "tipo", "valor", "status", "saldo_acumulado"];

    if (sampleRow.length >= 7) {
      return headers;
    }

    if (sampleRow.length >= 6) {
      return headers.slice(0, 6);
    }

    return sampleRow.map((_, index) => `col_${index + 1}`);
  }

  private static parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const binary = event.target?.result;
          const workbook = XLSX.read(binary, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData as any[]);
        } catch (error) {
          reject(new Error(`Erro ao processar Excel: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo Excel"));
      reader.readAsBinaryString(file);
    });
  }

  private static sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((left, right) => {
      const dateComparison = compareDateStrings(left.date, right.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return left.description.localeCompare(right.description, "pt-BR");
    });
  }

  private static processData(rawData: any[]): ImportResult {
    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rawData.length === 0) {
      errors.push("Arquivo vazio ou sem dados validos");
      return { transactions, errors, warnings };
    }

    const mapping = this.detectColumnMapping(rawData[0]);

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

    const sortedTransactions = this.sortTransactionsByDate(transactions);

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
    }

    return { transactions: sortedTransactions, errors, warnings };
  }

  private static detectColumnMapping(sampleRow: any): ColumnMapping {
    const mapping = { ...this.DEFAULT_MAPPING };
    const headers = Object.keys(sampleRow).map((header) => header.toLowerCase().trim());

    for (const [field, possibleHeaders] of Object.entries(this.COMMON_HEADERS)) {
      for (const header of headers) {
        if (possibleHeaders.some((possibleHeader) => header.includes(possibleHeader) || possibleHeader.includes(header))) {
          (mapping as any)[field] = Object.keys(sampleRow).find((key) => key.toLowerCase().trim() === header) || field;
          break;
        }
      }
    }

    return mapping;
  }

  private static mapRowToTransaction(row: any, mapping: ColumnMapping, rowNumber: number): Transaction | null {
    const descricao = this.extractStringValue(row, mapping.descricao);
    const valorRaw = this.extractNumericValue(row, mapping.valor);
    const dataRaw = this.extractStringValue(row, mapping.data);
    const categoria = this.extractStringValue(row, mapping.categoria) || "Importado";
    const tipoRaw = this.extractStringValue(row, mapping.tipo);
    const subcategoriaRaw = this.extractStringValue(row, mapping.subcategoria);
    const statusRaw = this.extractStringValue(row, mapping.status);

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
      const tipoLower = tipoRaw.toLowerCase();
      if (
        tipoLower.includes("entrada") ||
        tipoLower.includes("income") ||
        tipoLower.includes("recebimento") ||
        tipoLower.includes("renda")
      ) {
        tipo = TransactionType.INCOME;
      } else if (
        tipoLower.includes("saida") ||
        tipoLower.includes("expense") ||
        tipoLower.includes("pagamento") ||
        tipoLower.includes("despesa")
      ) {
        tipo = TransactionType.EXPENSE;
      } else if (valorRaw < 0) {
        tipo = TransactionType.EXPENSE;
      } else if (valorRaw > 0) {
        tipo = TransactionType.INCOME;
      }
    } else {
      tipo = valorRaw >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
    }

    let subcategoria: TransactionSubcategory = TransactionSubcategory.HOME;
    if (subcategoriaRaw) {
      const subLower = subcategoriaRaw.toLowerCase();
      if (subLower.includes("loja") || subLower.includes("store") || subLower.includes("mei")) {
        subcategoria = TransactionSubcategory.STORE;
      }
    } else if (categoria) {
      const catLower = categoria.toLowerCase();
      if (catLower.includes("loja - vendas") || catLower.includes("loja - estoque")) {
        subcategoria = TransactionSubcategory.STORE;
      } else if (catLower.includes("moradia") || catLower.includes("aluguel")) {
        subcategoria = TransactionSubcategory.HOME;
      }
    }

    let status: Transaction["status"] = TransactionStatus.COMPLETED;
    if (statusRaw) {
      const statusLower = statusRaw.toLowerCase();
      if (statusLower.includes("pendente") || statusLower.includes("pending") || statusLower.includes("nao pago")) {
        status = TransactionStatus.PENDING;
      } else if (
        statusLower.includes("pago") ||
        statusLower.includes("paid") ||
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
      status,
      recurring: false,
    };
  }

  private static extractStringValue(row: any, field: string): string | undefined {
    const value = row[field];
    if (value === null || value === undefined) {
      return undefined;
    }
    return String(value).trim();
  }

  private static extractNumericValue(row: any, field: string): number | null {
    const value = row[field];
    if (value === null || value === undefined || value === "") {
      return null;
    }

    let cleaned = String(value).trim();
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
    return Number.isNaN(parsed) ? null : parsed;
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

      const parsedDate = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
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
      const parsedDate = new Date(date);
      return !Number.isNaN(parsedDate.getTime());
    }

    return !Number.isNaN(date.getTime());
  }
}
