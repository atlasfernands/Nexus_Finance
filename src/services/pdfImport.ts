import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import type { RawImportRow } from "./import";

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_LENGTH_FOR_PARSE = 40;

type PdfTextItem = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
};

type PdfPageProxy = {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
};

type PdfDocumentProxy = {
  destroy: () => Promise<void>;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  numPages: number;
};

type PdfJsModule = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (params: {
    data: Uint8Array;
    disableFontFace?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }) => {
    promise: Promise<PdfDocumentProxy>;
  };
};

interface PdfStatementParseResult {
  rawRows: RawImportRow[];
  warnings: string[];
}

interface ParsedStatementLine {
  amount: number;
  date: string;
  description: string;
  identifier?: string;
}

interface PdfBankAdapter {
  detect: (text: string) => boolean;
  name: string;
  parse: (text: string, fileName?: string) => PdfStatementParseResult;
}

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  feb: 2,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  mai: 5,
  maio: 5,
  may: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  set: 9,
  setembro: 9,
  sep: 9,
  sept: 9,
  out: 10,
  outubro: 10,
  oct: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
  dec: 12,
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfLine(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function extractYearFromText(text: string, fileName?: string) {
  const source = `${fileName ?? ""} ${text}`;
  const yearMatch = source.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
}

function formatDate(day: number, month: number, year: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function parseDateFromChunk(chunk: string, fallbackYear: number) {
  const numericDateMatch = chunk.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (numericDateMatch) {
    const [, day, month, year] = numericDateMatch;
    const fullYear = year.length === 2 ? Number(`20${year}`) : Number(year);
    return {
      raw: numericDateMatch[0],
      value: formatDate(Number(day), Number(month), fullYear),
    };
  }

  const monthDateMatch = chunk.match(/\b(\d{1,2})\s+(\p{L}{3,9})\.?\s*(20\d{2})?\b/u);
  if (!monthDateMatch) {
    return null;
  }

  const [, day, monthName, year] = monthDateMatch;
  const month = MONTH_ALIASES[normalizeText(monthName)];
  if (!month) {
    return null;
  }

  return {
    raw: monthDateMatch[0],
    value: formatDate(Number(day), month, year ? Number(year) : fallbackYear),
  };
}

function parseMoneyValue(rawValue: string) {
  const isNegative = rawValue.includes("-") || (rawValue.includes("(") && rawValue.includes(")"));
  let cleaned = rawValue.replace(/[R$\s()]/g, "");
  cleaned = cleaned.replace(/[^\d.,-]/g, "");

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");

    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  }

  cleaned = cleaned.replace(/[^\d.-]/g, "");

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

function extractMoney(chunk: string) {
  const moneyMatches = Array.from(
    chunk.matchAll(/(?:[-+()]?\s*R\$\s*)?[-(]?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2}|\.\d{2})\)?/g)
  );
  const validMatches = moneyMatches
    .map((match) => ({
      raw: match[0],
      index: match.index ?? 0,
      value: parseMoneyValue(match[0]),
    }))
    .filter((match): match is { raw: string; index: number; value: number } => match.value !== null);

  return validMatches.at(-1) ?? null;
}

function inferSignedAmount(description: string, amount: number, rawAmount: string) {
  if (rawAmount.includes("-") || (rawAmount.includes("(") && rawAmount.includes(")"))) {
    return -Math.abs(amount);
  }

  const normalizedDescription = normalizeText(description);
  const expenseTerms = [
    "transferencia enviada",
    "pix enviado",
    "enviada pelo pix",
    "compra no debito",
    "pagamento de fatura",
    "pagamento",
    "boleto pago",
    "saque",
    "debito",
  ];
  const incomeTerms = [
    "transferencia recebida",
    "pix recebido",
    "recebida pelo pix",
    "credito em conta",
    "estorno",
    "deposito",
    "recebida",
  ];

  if (incomeTerms.some((term) => normalizedDescription.includes(term))) {
    return Math.abs(amount);
  }

  if (expenseTerms.some((term) => normalizedDescription.includes(term))) {
    return -Math.abs(amount);
  }

  return amount;
}

function cleanDescription(chunk: string, rawDate: string, rawAmount: string) {
  return normalizePdfLine(
    chunk
      .replace(rawDate, " ")
      .replace(rawAmount, " ")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, " ")
      .replace(/\b(saldo|valor|data|descricao|identificador)\b/gi, " ")
      .replace(/\s+-\s*$/g, " ")
  );
}

function getChunkIdentifier(chunk: string, index: number) {
  const uuidMatch = chunk.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  return uuidMatch?.[0] ?? `pdf-nubank-linha-${index + 1}`;
}

function parseStatementLine(chunk: string, index: number, fallbackYear: number): ParsedStatementLine | null {
  const date = parseDateFromChunk(chunk, fallbackYear);
  const money = extractMoney(chunk);

  if (!date || !money) {
    return null;
  }

  const description = cleanDescription(chunk, date.raw, money.raw);
  if (description.length < 3) {
    return null;
  }

  return {
    amount: inferSignedAmount(description, money.value, money.raw),
    date: date.value,
    description,
    identifier: getChunkIdentifier(chunk, index),
  };
}

function buildTransactionChunks(lines: string[]) {
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  lines.forEach((line) => {
    const hasDate =
      /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(line) ||
      /\b\d{1,2}\s+\p{L}{3,9}\.?\s*(20\d{2})?\b/u.test(line);

    if (hasDate && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [line];
      return;
    }

    if (hasDate || currentChunk.length > 0) {
      currentChunk.push(line);
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

function hasNubankSignals(text: string) {
  const normalized = normalizeText(text);
  return (
    normalized.includes("nubank") ||
    normalized.includes("nu pagamentos") ||
    normalized.includes("nu financ") ||
    normalized.includes("transferencia recebida pelo pix") ||
    normalized.includes("transferencia enviada pelo pix") ||
    normalized.includes("compra no debito")
  );
}

function parseNubankStatementText(text: string, fileName?: string): PdfStatementParseResult {
  const compactText = normalizePdfLine(text);
  const lines = text
    .split(/\r?\n/)
    .map(normalizePdfLine)
    .filter(Boolean);
  const fallbackYear = extractYearFromText(compactText, fileName);
  const parsedLines = buildTransactionChunks(lines)
    .map((chunk, index) => parseStatementLine(chunk, index, fallbackYear))
    .filter((row): row is ParsedStatementLine => row !== null);

  if (parsedLines.length === 0) {
    throw new Error(
      "Nao consegui identificar lancamentos nesse PDF. Se ele for escaneado ou tiver layout diferente, exporte o CSV do banco por enquanto."
    );
  }

  return {
    rawRows: parsedLines.map((row) => ({
      Data: row.date,
      Valor: row.amount.toFixed(2),
      Identificador: row.identifier,
      Descricao: row.description,
    })),
    warnings: [
      "PDF processado localmente no navegador; o arquivo nao foi enviado para servidores.",
      "Conversor PDF Nubank em modo inicial: revise a previa antes de confirmar a importacao.",
    ],
  };
}

const PDF_BANK_ADAPTERS: PdfBankAdapter[] = [
  {
    name: "Nubank",
    detect: hasNubankSignals,
    parse: parseNubankStatementText,
  },
];

export function parsePdfStatementText(text: string, fileName?: string): PdfStatementParseResult {
  const compactText = normalizePdfLine(text);

  if (compactText.length < MIN_TEXT_LENGTH_FOR_PARSE) {
    throw new Error(
      "Este PDF nao tem texto selecionavel suficiente. Por enquanto, importe um PDF pesquisavel ou exporte o extrato em CSV."
    );
  }

  const adapter = PDF_BANK_ADAPTERS.find((candidate) => candidate.detect(compactText));
  if (!adapter) {
    throw new Error("PDF ainda nao reconhecido. Nesta primeira versao, o conversor PDF aceita extratos Nubank em texto.");
  }

  return adapter.parse(text, fileName);
}

function buildLinesFromTextItems(items: PdfTextItem[]) {
  const positionedItems = items
    .map((item) => ({
      text: normalizePdfLine(item.str ?? ""),
      x: item.transform?.[4],
      y: item.transform?.[5],
    }))
    .filter((item): item is { text: string; x: number; y: number } =>
      item.text !== "" && typeof item.x === "number" && typeof item.y === "number"
    );

  if (positionedItems.length >= Math.max(3, Math.floor(items.length * 0.5))) {
    const sortedItems = [...positionedItems].sort((left, right) => {
      const yDifference = right.y - left.y;
      return Math.abs(yDifference) > 2 ? yDifference : left.x - right.x;
    });
    const lineGroups: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];

    sortedItems.forEach((item) => {
      const group = lineGroups.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
      if (group) {
        group.items.push({ text: item.text, x: item.x });
        return;
      }

      lineGroups.push({ y: item.y, items: [{ text: item.text, x: item.x }] });
    });

    return lineGroups.map((group) =>
      group.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(" ")
    );
  }

  const lines: string[] = [];
  let currentLine = "";

  items.forEach((item) => {
    const text = normalizePdfLine(item.str ?? "");
    if (!text) {
      return;
    }

    currentLine = currentLine ? `${currentLine} ${text}` : text;

    if (item.hasEOL) {
      lines.push(currentLine);
      currentLine = "";
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function extractTextFromPdf(file: File) {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pageTexts.push(buildLinesFromTextItems(textContent.items).join("\n"));
    }
  } finally {
    await document.destroy();
  }

  return pageTexts.join("\n");
}

export async function parsePdfFile(file: File): Promise<PdfStatementParseResult> {
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    throw new Error("PDF muito grande. Use arquivos de ate 10 MB para manter a importacao segura no aparelho.");
  }

  const text = await extractTextFromPdf(file);
  return parsePdfStatementText(text, file.name);
}
