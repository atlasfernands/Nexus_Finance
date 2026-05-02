/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Import as ImportIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { useFinance } from "../features/finance/FinanceContext";
import { DuplicateTransactionMatch, partitionTransactionsByDuplicates } from "../lib/transactionDuplicates";
import { cn, formatCurrency } from "../lib/utils";
import {
  buildCsvImportAiPromptTemplate,
  CSV_IMPORT_TEMPLATE_COLUMNS,
  CSV_IMPORT_TEMPLATE_DOWNLOAD_URL,
  ImportResult,
  ImportService,
} from "../services/import";
import {
  PrivacyStatus,
  acceptBankStatementConsent,
  fetchPrivacyStatus,
  hasActiveBankStatementConsent,
  hasRevokedBankStatementConsent,
} from "../services/legal";
import { Transaction, TransactionStatus, TransactionType } from "../types";

interface ImportPreviewResult extends Omit<ImportResult, "transactions"> {
  duplicateDecisions: Record<string, "ignore" | "keep">;
  duplicateMatches: DuplicateTransactionMatch[];
  transactions: Transaction[];
}

function formatTransactionTypeLabel(type: TransactionType) {
  return type === TransactionType.INCOME ? "Entrada" : "Saida";
}

function formatTransactionStatusLabel(status: TransactionStatus, type: TransactionType) {
  if (status === TransactionStatus.PAID) {
    return type === TransactionType.INCOME ? "Recebido" : "Pago";
  }

  if (status === TransactionStatus.PENDING) {
    return "Pendente";
  }

  if (status === TransactionStatus.CANCELLED) {
    return "Cancelado";
  }

  return "Pago / Recebido";
}

function formatSignedCurrency(value: number, isNegative: boolean) {
  const formatted = formatCurrency(Math.abs(value));
  return isNegative ? `(${formatted})` : formatted;
}

function getDisplayedBalance(transaction: Transaction) {
  if (typeof transaction.runningBalance !== "number") {
    return "-";
  }

  return formatSignedCurrency(transaction.runningBalance, transaction.runningBalance < 0);
}

function formatDuplicateSourceLabel(source: DuplicateTransactionMatch["source"]) {
  return source === "existing" ? "Ja existe no sistema" : "Repetido no proprio arquivo";
}

export default function ImportTransactions() {
  const { importTransactions, state } = useFinance();
  const [importResult, setImportResult] = useState<ImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus | null>(null);
  const [pendingConsentFile, setPendingConsentFile] = useState<File | null>(null);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [statementConsentChecked, setStatementConsentChecked] = useState(false);
  const [aggregateConsentChecked, setAggregateConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiPromptTemplate = useMemo(() => buildCsvImportAiPromptTemplate(), []);

  const selectedDuplicates = importResult
    ? importResult.duplicateMatches.filter((duplicate) =>
        importResult.duplicateDecisions[duplicate.transaction.id] === "keep"
      )
    : [];
  const unresolvedDuplicateCount = importResult
    ? importResult.duplicateMatches.filter(
        (duplicate) => !importResult.duplicateDecisions[duplicate.transaction.id]
      ).length
    : 0;
  const ignoredDuplicateCount = importResult
    ? importResult.duplicateMatches.filter(
        (duplicate) => importResult.duplicateDecisions[duplicate.transaction.id] === "ignore"
      ).length
    : 0;
  const transactionsToImport = importResult
    ? [...importResult.transactions, ...selectedDuplicates.map((duplicate) => duplicate.transaction)]
    : [];

  useEffect(() => {
    let mounted = true;

    fetchPrivacyStatus()
      .then((status) => {
        if (mounted) {
          setPrivacyStatus(status);
        }
      })
      .catch(() => {
        if (mounted) {
          setPrivacyStatus(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const parseFileForPreview = async (file: File) => {
    setLoading(true);

    try {
      const result = await ImportService.parseFile(file);
      const duplicateValidation = partitionTransactionsByDuplicates(result.transactions, state.transactions);
      const validationWarnings = [...result.warnings];

      if (duplicateValidation.duplicates.length > 0) {
        validationWarnings.push(
          `${duplicateValidation.duplicates.length} possivel(is) duplicado(s) no mesmo mes encontrado(s). Revise a lista abaixo e escolha manter ou ignorar cada um antes de importar.`
        );
      }

      setImportResult({
        ...result,
        duplicateDecisions: {},
        duplicateMatches: duplicateValidation.duplicates,
        transactions: duplicateValidation.accepted,
        warnings: validationWarnings,
      });
    } catch (caughtError) {
      setImportResult({
        duplicateDecisions: {},
        duplicateMatches: [],
        transactions: [],
        errors: [caughtError instanceof Error ? caughtError.message : "Erro desconhecido ao processar arquivo"],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importResult || transactionsToImport.length === 0) {
      return;
    }

    if (unresolvedDuplicateCount > 0) {
      alert("Revise todos os possiveis duplicados e escolha manter ou ignorar antes de importar.");
      return;
    }

    setLoading(true);

    try {
      const result = await importTransactions(
        [...importResult.transactions, ...importResult.duplicateMatches.map((duplicate) => duplicate.transaction)],
        {
          allowDuplicateIds: selectedDuplicates.map((duplicate) => duplicate.transaction.id),
        }
      );
      setImportResult(null);

      if (result.importedCount === 0) {
        alert("Nenhum lancamento novo foi importado. Todos foram identificados como duplicados.");
        return;
      }

      const keptNotice =
        result.keptDuplicateCount > 0
          ? ` ${result.keptDuplicateCount} duplicado(s) foram mantidos por sua escolha.`
          : "";
      const ignoredNotice =
        result.duplicateCount > 0 ? ` ${result.duplicateCount} duplicado(s) foram ignorados.` : "";
      alert(`${result.importedCount} transacoes importadas com sucesso!${keptNotice}${ignoredNotice}`);
    } catch (caughtError) {
      alert(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel salvar a importacao agora."
      );
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (file: File) => {
    setConsentError("");

    try {
      const latestPrivacyStatus = privacyStatus ?? (await fetchPrivacyStatus());
      setPrivacyStatus(latestPrivacyStatus);

      if (!hasActiveBankStatementConsent(latestPrivacyStatus)) {
        setPendingConsentFile(file);
        setStatementConsentChecked(false);
        setAggregateConsentChecked(false);
        setConsentModalOpen(true);

        if (hasRevokedBankStatementConsent(latestPrivacyStatus)) {
          setConsentError(
            "Voce revogou o consentimento para processamento de novos extratos. Para enviar outro extrato, sera necessario autorizar novamente."
          );
        }

        return;
      }

      await parseFileForPreview(file);
    } catch (caughtError) {
      setImportResult({
        duplicateDecisions: {},
        duplicateMatches: [],
        transactions: [],
        errors: [
          caughtError instanceof Error
            ? caughtError.message
            : "Nao foi possivel validar o consentimento antes do upload.",
        ],
        warnings: [],
      });
    }
  };

  const handleAuthorizeStatementProcessing = async () => {
    if (!statementConsentChecked) {
      setConsentError("Sem essa autorizacao, nao conseguimos processar extratos bancarios na sua conta.");
      return;
    }

    const fileToProcess = pendingConsentFile;
    setLoading(true);
    setConsentError("");

    try {
      await acceptBankStatementConsent(aggregateConsentChecked);
      const updatedPrivacyStatus = await fetchPrivacyStatus();
      setPrivacyStatus(updatedPrivacyStatus);
      setConsentModalOpen(false);
      setPendingConsentFile(null);

      if (fileToProcess) {
        await parseFileForPreview(fileToProcess);
      }
    } catch (caughtError) {
      setConsentError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o consentimento agora."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelStatementProcessing = () => {
    setConsentModalOpen(false);
    setPendingConsentFile(null);
    setStatementConsentChecked(false);
    setAggregateConsentChecked(false);
    setConsentError("Sem essa autorizacao, nao conseguimos processar extratos bancarios na sua conta.");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeItem = (id: string) => {
    if (!importResult) {
      return;
    }

    setImportResult({
      ...importResult,
      transactions: importResult.transactions.filter((transaction) => transaction.id !== id),
    });
  };

  const removeDuplicate = (id: string) => {
    if (!importResult) {
      return;
    }

    setImportResult({
      ...importResult,
      duplicateDecisions: Object.fromEntries(
        Object.entries(importResult.duplicateDecisions).filter(([transactionId]) => transactionId !== id)
      ),
      duplicateMatches: importResult.duplicateMatches.filter((duplicate) => duplicate.transaction.id !== id),
    });
  };

  const setDuplicateDecision = (id: string, decision: "ignore" | "keep") => {
    if (!importResult) {
      return;
    }

    setImportResult({
      ...importResult,
      duplicateDecisions: {
        ...importResult.duplicateDecisions,
        [id]: decision,
      },
    });
  };

  const setAllDuplicates = (decision: "ignore" | "keep") => {
    if (!importResult) {
      return;
    }

    setImportResult({
      ...importResult,
      duplicateDecisions: Object.fromEntries(
        importResult.duplicateMatches.map((duplicate) => [duplicate.transaction.id, decision])
      ),
    });
  };

  const copyPromptTemplate = async () => {
    try {
      await navigator.clipboard.writeText(aiPromptTemplate);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2200);
    } catch {
      alert("Nao foi possivel copiar o prompt agora. Tente selecionar o texto manualmente.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-bold text-white">Importacao Inteligente</h3>
          <p className="text-sm text-slate-500">
            Arraste seu arquivo CSV ou PDF de extrato para detectar e importar lancamentos automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          {consentError && (
            <div className="mb-4 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 px-4 py-3 text-sm text-brand-yellow">
              {consentError}
            </div>
          )}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (event.dataTransfer.files[0]) {
                processFile(event.dataTransfer.files[0]);
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all",
              dragActive ? "border-brand-green bg-brand-green/5 bg-opacity-10" : "border-brand-border hover:border-slate-600",
              loading && "pointer-events-none opacity-50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.pdf,text/csv,application/pdf"
              onChange={(event) => event.target.files?.[0] && processFile(event.target.files[0])}
            />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <Upload className={cn(dragActive ? "text-brand-green" : "text-slate-400")} size={32} />
            </div>
            <p className="font-medium text-white">Clique para selecionar ou arraste o arquivo</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">Formatos: CSV ou PDF texto</p>
            <p className="mt-2 max-w-md text-center text-xs text-slate-500">
              PDFs sao lidos localmente no navegador. Nesta primeira versao, o conversor PDF reconhece extratos
              Nubank pesquisaveis; PDFs escaneados precisam ser exportados em CSV.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-brand-green/20 bg-brand-green/10 p-2">
                  <FileSpreadsheet size={20} className="text-brand-green" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">Modelo recomendado</h4>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
                    <p>
                      <span className="font-semibold text-white">Categoria</span> e o grupo abrangente do lancamento.
                    </p>
                    <p>
                      <span className="font-semibold text-white">Descricao</span> e o item unitario que voce quer
                      identificar depois.
                    </p>
                    <p>
                      Na coluna `status`, use <span className="font-semibold text-white">Pendente</span>,
                      <span className="font-semibold text-white"> Pago</span> ou
                      <span className="font-semibold text-white"> Recebido</span>.
                    </p>
                    <p>
                      Em `subcategoria`, use <span className="font-semibold text-white">Casa</span> ou
                      <span className="font-semibold text-white"> Loja</span> quando quiser definir o modulo.
                    </p>
                  </div>

                  <a
                    href={CSV_IMPORT_TEMPLATE_DOWNLOAD_URL}
                    download
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-green/90"
                  >
                    <Download size={16} /> Baixar modelo CSV
                  </a>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-brand-border">
              <div className="border-b border-brand-border bg-slate-900/70 px-4 py-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-white">Campos aceitos</h4>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna</TableHead>
                      <TableHead>Obrigatoria</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Formato aceito</TableHead>
                      <TableHead>Exemplo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CSV_IMPORT_TEMPLATE_COLUMNS.map((column) => (
                      <TableRow key={column.key}>
                        <TableCell className="font-mono text-white">{column.key}</TableCell>
                        <TableCell className={column.required ? "text-brand-green" : "text-slate-400"}>
                          {column.required ? "Sim" : "Opcional"}
                        </TableCell>
                        <TableCell className="text-slate-300">{column.description}</TableCell>
                        <TableCell className="text-slate-300">{column.acceptedValues}</TableCell>
                        <TableCell className="font-mono text-slate-300">{column.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-brand-yellow/20 bg-brand-yellow/5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-brand-yellow">
                  <Sparkles size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">Prompt pronto para IA</h4>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Se voce usa ChatGPT, Gemini ou outra IA no celular, basta baixar o modelo CSV, copiar o prompt
                  abaixo e trocar pelos seus recebimentos e contas fixas. Depois, e so pedir para a IA gerar o arquivo
                  CSV no formato correto para importar no Nexus Finance.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Smartphone size={14} className="text-brand-green" />
                  Funciona muito bem no celular para montar sua planilha rapido. So lembre de pedir que a IA responda
                  apenas com o conteudo final do arquivo CSV, sem explicacoes, titulos ou bloco de codigo.
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={promptCopied ? "primary" : "secondary"}
                  onClick={() => {
                    void copyPromptTemplate();
                  }}
                  className="flex items-center gap-2"
                >
                  <Copy size={16} /> {promptCopied ? "Prompt copiado" : "Copiar prompt"}
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-brand-border bg-slate-950/80">
              <div className="border-b border-brand-border px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Cole este prompt na sua IA e substitua pelos seus dados
                </p>
              </div>
              <textarea
                readOnly
                value={aiPromptTemplate}
                className="min-h-[360px] w-full resize-y border-0 bg-transparent px-4 py-4 font-mono text-xs leading-6 text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {importResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {importResult.errors.length > 0 && (
              <Card className="border-brand-red/20 bg-brand-red/5">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-3 text-brand-red">
                    <AlertCircle size={20} />
                    <h4 className="font-bold">Erros encontrados</h4>
                  </div>
                  <ul className="space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-brand-red/80">
                        - {error}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {importResult.warnings.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-3 text-yellow-500">
                    <AlertTriangle size={20} />
                    <h4 className="font-bold">Avisos</h4>
                  </div>
                  <ul className="space-y-1">
                    {importResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-500/80">
                        - {warning}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(importResult.transactions.length > 0 || importResult.duplicateMatches.length > 0) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-brand-green">
                      <CheckCircle2 size={24} />
                      <h3 className="text-xl font-bold text-white">
                        {transactionsToImport.length} Lancamentos Selecionados
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setImportResult(null)}>
                        Limpar
                      </Button>
                      <Button
                        onClick={() => {
                          void handleImport();
                        }}
                        className="flex items-center gap-2"
                        disabled={loading || unresolvedDuplicateCount > 0}
                      >
                        <ImportIcon size={18} /> {loading ? "Salvando..." : "Confirmar Importacao"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-brand-border bg-slate-900/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Prontos</p>
                      <p className="mt-2 text-xl font-semibold text-white">{importResult.transactions.length}</p>
                    </div>
                    <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-red">A Revisar</p>
                      <p className="mt-2 text-xl font-semibold text-white">{unresolvedDuplicateCount}</p>
                    </div>
                    <div className="rounded-lg border border-brand-yellow/20 bg-brand-yellow/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-yellow">Duplicados Mantidos</p>
                      <p className="mt-2 text-xl font-semibold text-white">{selectedDuplicates.length}</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border border-brand-border bg-slate-900/60 p-3 text-sm text-slate-300">
                    Total da importacao: <span className="font-semibold text-white">{transactionsToImport.length}</span>
                    {" • "}
                    Ignorados por escolha: <span className="font-semibold text-white">{ignoredDuplicateCount}</span>
                    {unresolvedDuplicateCount > 0 && (
                      <>
                        {" • "}
                        <span className="text-brand-yellow">
                          finalize a revisao dos duplicados para liberar a importacao
                        </span>
                      </>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    {importResult.transactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descricao</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Saldo Acumulado</TableHead>
                            <TableHead>Acoes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.transactions.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-slate-400">{item.date}</TableCell>
                              <TableCell className="text-white">{item.description}</TableCell>
                              <TableCell className="text-slate-300">{item.category}</TableCell>
                              <TableCell className="text-white">
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                    item.type === TransactionType.INCOME
                                      ? "bg-brand-green/10 text-brand-green"
                                      : "bg-brand-red/10 text-brand-red"
                                  )}
                                >
                                  {formatTransactionTypeLabel(item.type)}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-white">
                                {formatSignedCurrency(item.amount, item.type === TransactionType.EXPENSE)}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {formatTransactionStatusLabel(item.status, item.type)}
                              </TableCell>
                              <TableCell className="font-mono text-slate-300">
                                {getDisplayedBalance(item)}
                              </TableCell>
                              <TableCell className="text-right">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-sm text-slate-500 transition-colors hover:text-brand-red"
                                >
                                  Remover
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="rounded-lg border border-brand-border bg-slate-900/60 p-4 text-sm text-slate-400">
                        Nenhum lancamento unico ficou na previa. Se quiser, selecione os duplicados abaixo para manter.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {importResult.duplicateMatches.length > 0 && (
              <Card className="border-brand-yellow/20">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Possiveis Duplicados no Mesmo Mes</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Cada duplicado precisa de uma decisao explicita antes de importar.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setAllDuplicates("ignore")}>
                        Ignorar Todos
                      </Button>
                      <Button onClick={() => setAllDuplicates("keep")}>Manter Todos</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {importResult.duplicateMatches.map((duplicate) => {
                      const currentDecision = importResult.duplicateDecisions[duplicate.transaction.id];
                      const isIgnored = currentDecision === "ignore";
                      const isSelected = currentDecision === "keep";

                      return (
                        <div
                          key={duplicate.transaction.id}
                          className={cn(
                            "rounded-xl border p-4 transition-colors",
                            isSelected
                              ? "border-brand-green/30 bg-brand-green/5"
                              : isIgnored
                                ? "border-brand-border bg-slate-900/70"
                              : "border-brand-yellow/20 bg-slate-900/50"
                          )}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {formatDuplicateSourceLabel(duplicate.source)}
                              </p>
                              <p className="mt-2 text-sm text-slate-300">
                                Mesmo mes, descricao, categoria, tipo e valor.
                              </p>
                              <p
                                className={cn(
                                  "mt-2 text-xs font-semibold uppercase tracking-widest",
                                  isSelected
                                    ? "text-brand-green"
                                    : isIgnored
                                      ? "text-slate-400"
                                      : "text-brand-yellow"
                                )}
                              >
                                {isSelected ? "Decisao: manter" : isIgnored ? "Decisao: ignorar" : "Decisao pendente"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setDuplicateDecision(duplicate.transaction.id, "ignore")}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                                  isIgnored
                                    ? "border-slate-500 bg-slate-800 text-white"
                                    : "border-brand-border text-slate-400 hover:border-slate-500 hover:text-white"
                                )}
                              >
                                Ignorar Este
                              </button>
                              <button
                                type="button"
                                onClick={() => setDuplicateDecision(duplicate.transaction.id, "keep")}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                                  isSelected
                                    ? "border-brand-green bg-brand-green text-black"
                                    : "border-brand-border text-slate-400 hover:border-brand-green/40 hover:text-brand-green"
                                )}
                              >
                                Manter Este
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDuplicate(duplicate.transaction.id)}
                                className="rounded-lg border border-brand-border px-3 py-2 text-sm text-slate-400 transition-colors hover:border-brand-red/30 hover:text-brand-red"
                              >
                                Remover da Previa
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-brand-border bg-slate-900/70 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ja existente</p>
                              <p className="mt-2 text-sm font-medium text-white">{duplicate.duplicateOf.description}</p>
                              <p className="mt-1 text-xs text-slate-400">{duplicate.duplicateOf.date}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {duplicate.duplicateOf.subcategory} - {duplicate.duplicateOf.category}
                              </p>
                              <p className="mt-3 font-mono text-sm text-brand-yellow">
                                {formatCurrency(duplicate.duplicateOf.amount)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Novo do arquivo</p>
                              <p className="mt-2 text-sm font-medium text-white">{duplicate.transaction.description}</p>
                              <p className="mt-1 text-xs text-slate-400">{duplicate.transaction.date}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {duplicate.transaction.subcategory} - {duplicate.transaction.category}
                              </p>
                              <p className="mt-3 font-mono text-sm text-brand-green">
                                {formatCurrency(duplicate.transaction.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {consentModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-statement-consent-title"
            className="w-full max-w-xl rounded-[28px] border border-brand-border bg-brand-card p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-brand-green/20 bg-brand-green/10 p-3 text-brand-green">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 id="bank-statement-consent-title" className="text-xl font-bold text-white">
                  Autorizacao para processamento do extrato bancario
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Para gerar suas analises financeiras, precisamos processar o arquivo de extrato bancario que voce
                  enviar. O extrato pode conter informacoes pessoais e financeiras, como banco, datas, descricoes de
                  transacoes, valores, receitas, despesas, saldos e identificacao de estabelecimentos. Usaremos esses
                  dados apenas para organizar, categorizar e apresentar suas informacoes financeiras dentro da sua conta.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-brand-border bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                <input
                  type="checkbox"
                  checked={statementConsentChecked}
                  onChange={(event) => setStatementConsentChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-border bg-slate-950 accent-brand-green"
                />
                <span>
                  Autorizo o processamento do meu extrato bancario para fins de organizacao e analise das minhas
                  financas pessoais.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-brand-border bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                <input
                  type="checkbox"
                  checked={aggregateConsentChecked}
                  onChange={(event) => setAggregateConsentChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-border bg-slate-950 accent-brand-green"
                />
                <span>
                  Autorizo o uso de dados anonimizados e agregados para melhoria do sistema, sem identificacao pessoal.
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={handleCancelStatementProcessing} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleAuthorizeStatementProcessing();
                }}
                disabled={loading || !statementConsentChecked}
              >
                {loading ? "Autorizando..." : "Autorizar e continuar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
