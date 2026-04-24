/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Import as ImportIcon, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { useFinance } from "../features/finance/FinanceContext";
import { cn } from "../lib/utils";
import { ImportResult, ImportService } from "../services/import";
import { TransactionType } from "../types";

export default function ImportTransactions() {
  const { dispatch } = useFinance();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setLoading(true);

    try {
      const result = await ImportService.parseFile(file);
      setImportResult(result);
    } catch (caughtError) {
      setImportResult({
        transactions: [],
        errors: [caughtError instanceof Error ? caughtError.message : "Erro desconhecido ao processar arquivo"],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!importResult || importResult.transactions.length === 0) {
      return;
    }

    importResult.transactions.forEach((transaction) =>
      dispatch({ type: "ADD_TRANSACTION", payload: transaction })
    );
    setImportResult(null);
    alert(`${importResult.transactions.length} transacoes importadas com sucesso!`);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-bold text-white">Importacao Inteligente</h3>
          <p className="text-sm text-slate-500">
            Arraste seu arquivo CSV ou Excel (XLSX) para detectar e importar lancamentos automaticamente.
          </p>
        </CardHeader>
        <CardContent>
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
              accept=".csv,.xlsx,.xls"
              onChange={(event) => event.target.files?.[0] && processFile(event.target.files[0])}
            />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <Upload className={cn(dragActive ? "text-brand-green" : "text-slate-400")} size={32} />
            </div>
            <p className="font-medium text-white">Clique para selecionar ou arraste o arquivo</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">Formatos: CSV, XLSX, XLS</p>
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

            {importResult.transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-brand-green">
                      <CheckCircle2 size={24} />
                      <h3 className="text-xl font-bold text-white">
                        {importResult.transactions.length} Lancamentos Detectados
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setImportResult(null)}>
                        Limpar
                      </Button>
                      <Button onClick={handleImport} className="flex items-center gap-2">
                        <ImportIcon size={18} /> Confirmar Importacao
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Descricao</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.transactions.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                  item.type === TransactionType.INCOME
                                    ? "bg-brand-green/10 text-brand-green"
                                    : "bg-brand-red/10 text-brand-red"
                                )}
                              >
                                {item.type}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-400">{item.date}</TableCell>
                            <TableCell className="text-white">{item.description}</TableCell>
                            <TableCell className="text-slate-300">{item.category}</TableCell>
                            <TableCell className="text-white">
                              {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
