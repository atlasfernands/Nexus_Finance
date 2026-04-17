import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Transaction, TransactionSubcategory } from "../types";
import { generateId } from "../lib/utils";

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
    tipo: ["tipo", "type", "operacao", "operation", "movimento", "tipo\n(entrada/saída)"],
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
      throw new Error("Formato de arquivo não suportado. Use CSV ou XLSX.");
    }

    return this.processData(rawData);
  }

  private static parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false, // Don't assume first row is headers
        skipEmptyLines: true,
        complete: (results) => {
          let data = results.data as any[];

          // Skip non-data rows (titles, empty rows, etc.)
          data = data.filter((row: any) => {
            if (!Array.isArray(row) || row.length === 0) return false;

            // Skip rows that look like titles
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('controle financeiro') ||
                rowText.includes('lançamentos') ||
                rowText.includes('📋')) {
              return false;
            }

            // Skip rows that don't have enough columns or look like headers
            if (row.length < 3) return false;

            // Check if this looks like a data row (has date in first column)
            const firstCol = String(row[0] || '').trim();
            const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            return datePattern.test(firstCol);
          });

          // Convert to objects using detected headers
          if (data.length > 0) {
            // Use the first data row to detect column structure
            const sampleRow = data[0];
            const headers = this.inferHeadersFromData(sampleRow);

            data = data.map((row: any) => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
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
    const headers = ['data', 'descricao', 'categoria', 'tipo', 'valor', 'status', 'saldo_acumulado'];

    // Adjust based on actual data
    if (sampleRow.length >= 7) {
      return headers;
    } else if (sampleRow.length >= 6) {
      return headers.slice(0, 6);
    } else {
      return sampleRow.map((_, i) => `col_${i + 1}`);
    }
  }

  private static parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const bstr = e.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws);
          resolve(jsonData as any[]);
        } catch (error) {
          reject(new Error(`Erro ao processar Excel: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo Excel"));
      reader.readAsBinaryString(file);
    });
  }

  private static processData(rawData: any[]): ImportResult {
    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rawData.length === 0) {
      errors.push("Arquivo vazio ou sem dados válidos");
      return { transactions, errors, warnings };
    }

    // Auto-detect column mapping
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

    // Generate warnings for common issues
    if (transactions.length > 0) {
      const hasInvalidDates = transactions.some(t => !this.isValidDate(t.data));
      if (hasInvalidDates) {
        warnings.push("Algumas datas podem estar em formato incorreto");
      }

      const hasZeroValues = transactions.some(t => t.valor === 0);
      if (hasZeroValues) {
        warnings.push("Algumas transações têm valor zero");
      }
    }

    return { transactions, errors, warnings };
  }

  private static detectColumnMapping(sampleRow: any): ColumnMapping {
    const mapping = { ...this.DEFAULT_MAPPING };
    const headers = Object.keys(sampleRow).map(h => h.toLowerCase().trim());

    for (const [field, possibleHeaders] of Object.entries(this.COMMON_HEADERS)) {
      for (const header of headers) {
        if (possibleHeaders.some(ph => header.includes(ph) || ph.includes(header))) {
          (mapping as any)[field] = Object.keys(sampleRow).find(h => h.toLowerCase().trim() === header) || field;
          break;
        }
      }
    }

    return mapping;
  }

  private static mapRowToTransaction(
    row: any,
    mapping: ColumnMapping,
    rowNumber: number
  ): Transaction | null {
    // Extract values with fallbacks
    const descricao = this.extractStringValue(row, mapping.descricao);
    const valorRaw = this.extractNumericValue(row, mapping.valor);
    const dataRaw = this.extractStringValue(row, mapping.data);
    const categoria = this.extractStringValue(row, mapping.categoria) || "Importado";
    const tipoRaw = this.extractStringValue(row, mapping.tipo);
    const subcategoriaRaw = this.extractStringValue(row, mapping.subcategoria);
    const statusRaw = this.extractStringValue(row, mapping.status);

    // Validate required fields
    if (!descricao) {
      throw new Error("Descrição obrigatória não encontrada");
    }

    if (valorRaw === null || isNaN(valorRaw)) {
      throw new Error("Valor numérico obrigatório não encontrado");
    }

    // Process data
    const data = this.normalizeDate(dataRaw);
    if (!data) {
      throw new Error(`Data inválida: ${dataRaw}`);
    }

    // Determine transaction type
    let tipo: "entrada" | "saída" = "saída";
    if (tipoRaw) {
      const tipoLower = tipoRaw.toLowerCase();
      if (tipoLower.includes("entrada") || tipoLower.includes("🟢") || tipoLower.includes("income") ||
          tipoLower.includes("recebimento") || tipoLower.includes("renda")) {
        tipo = "entrada";
      } else if (tipoLower.includes("saída") || tipoLower.includes("🔴") || tipoLower.includes("expense") ||
                 tipoLower.includes("pagamento") || tipoLower.includes("despesa")) {
        tipo = "saída";
      } else if (valorRaw < 0) {
        tipo = "saída";
      } else if (valorRaw > 0) {
        tipo = "entrada";
      }
    } else {
      tipo = valorRaw >= 0 ? "entrada" : "saída";
    }

    // Determine subcategoria
    let subcategoria: TransactionSubcategory = "Casa";
    if (subcategoriaRaw) {
      const subLower = subcategoriaRaw.toLowerCase();
      if (subLower.includes("loja") || subLower.includes("store") || subLower.includes("mei")) {
        subcategoria = "Loja";
      }
    } else if (categoria) {
      // Try to extract subcategoria from categoria field
      const catLower = categoria.toLowerCase();
      if (catLower.includes("loja - vendas") || catLower.includes("loja - estoque")) {
        subcategoria = "Loja";
      } else if (catLower.includes("moradia") || catLower.includes("aluguel")) {
        subcategoria = "Casa";
      }
    }

    // Determine status
    let status: Transaction["status"] = "realizado";
    if (statusRaw) {
      const statusLower = statusRaw.toLowerCase();
      if (statusLower.includes("pendente") || statusLower.includes("pending") ||
          statusLower.includes("⏳") || statusLower.includes("não pago")) {
        status = "pendente";
      } else if (statusLower.includes("pago") || statusLower.includes("paid") ||
                 statusLower.includes("✅") || statusLower.includes("realizado") ||
                 statusLower.includes("feito")) {
        status = "realizado";
      }
    }

    return {
      id: generateId(),
      data,
      descricao,
      categoria,
      subcategoria,
      tipo,
      valor: Math.abs(valorRaw),
      status,
      recorrente: false,
    };
  }

  private static extractStringValue(row: any, field: string): string | undefined {
    const value = row[field];
    if (value === null || value === undefined) return undefined;
    return String(value).trim();
  }

  private static extractNumericValue(row: any, field: string): number | null {
    const value = row[field];
    if (value === null || value === undefined || value === "") return null;

    let cleaned = String(value).trim();

    // Remove currency symbols, parentheses, and spaces
    cleaned = cleaned
      .replace(/[()]/g, '')
      .replace(/R\$\s*/g, '')
      .replace(/\s+/g, '');

    // Keep only digits, dots, commas and minus
    cleaned = cleaned.replace(/[^\d.,-]/g, '');

    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    if (hasDot && hasComma) {
      const lastDot = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');

      if (lastComma > lastDot) {
        // Brazilian format with thousand separators and decimal comma
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(/,/, '.');
      } else {
        // American style with comma thousand separators and dot decimal separator
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (hasComma) {
      cleaned = cleaned.replace(/,/, '.');
    }

    cleaned = cleaned.replace(/[^\d.\-]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private static normalizeDate(dateStr: string): string | null {
    if (!dateStr) return null;

    // Try different date formats
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY/MM/DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // DD/MM/YY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let day, month, year;

        if (format === formats[0] || format === formats[1]) {
          // DD/MM/YYYY or DD-MM-YYYY
          [, day, month, year] = match;
        } else if (format === formats[2] || format === formats[3]) {
          // YYYY/MM/DD or YYYY-MM-DD
          [, year, month, day] = match;
        } else {
          // DD/MM/YY
          [, day, month, year] = match;
          year = `20${year}`;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (this.isValidDate(date)) {
          return date.toLocaleDateString('pt-BR');
        }
      }
    }

    // Try to parse as ISO date
    const isoDate = new Date(dateStr);
    if (this.isValidDate(isoDate)) {
      return isoDate.toLocaleDateString('pt-BR');
    }

    return null;
  }

  private static isValidDate(date: Date | string): boolean {
    if (typeof date === "string") {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    return !isNaN(date.getTime());
  }
}
