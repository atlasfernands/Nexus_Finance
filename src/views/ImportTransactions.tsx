/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Import as ImportIcon, AlertTriangle } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ImportService, ImportResult } from "../services/import";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";

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
    } catch (error) {
      setImportResult({
        transactions: [],
        errors: [error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo"],
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!importResult || importResult.transactions.length === 0) return;
    importResult.transactions.forEach(t => dispatch({ type: "ADD_TRANSACTION", payload: t }));
    setImportResult(null);
    alert(`${importResult.transactions.length} transações importadas com sucesso!`);
  };

  const removeItem = (id: string) => {
    if (!importResult) return;
    setImportResult({
      ...importResult,
      transactions: importResult.transactions.filter(t => t.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-xl font-bold text-white">Importação Inteligente</h3>
          <p className="text-slate-500 text-sm">
            Arraste seu arquivo CSV ou Excel (XLSX) para detectar e importar lançamentos automaticamente.
            O sistema detecta automaticamente as colunas e mapeia os dados.
          </p>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
              dragActive ? "border-brand-green bg-brand-green/5 bg-opacity-10" : "border-brand-border hover:border-slate-600",
              loading && "opacity-50 pointer-events-none"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Upload className={cn(dragActive ? "text-brand-green" : "text-slate-400")} size={32} />
            </div>
            <p className="text-white font-medium">Clique para selecionar ou arraste o arquivo</p>
            <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">Formatos: CSV, XLSX, XLS</p>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Errors */}
            {importResult.errors.length > 0 && (
              <Card className="border-brand-red/20 bg-brand-red/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-brand-red mb-4">
                    <AlertCircle size={20} />
                    <h4 className="font-bold">Erros encontrados</h4>
                  </div>
                  <ul className="space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-brand-red/80">• {error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-yellow-500 mb-4">
                    <AlertTriangle size={20} />
                    <h4 className="font-bold">Avisos</h4>
                  </div>
                  <ul className="space-y-1">
                    {importResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-500/80">• {warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Success with transactions */}
            {importResult.transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-brand-green">
                      <CheckCircle2 size={24} />
                      <h3 className="text-xl font-bold text-white">{importResult.transactions.length} Lançamentos Detectados</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setImportResult(null)}>
                        Limpar
                      </Button>
                      <Button onClick={handleImport} className="flex items-center gap-2">
                        <ImportIcon size={18} /> Confirmar Importação
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
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.transactions.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold",
                                item.tipo === "entrada" ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"
                              )}>
                                {item.tipo}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-slate-400">{item.data}</TableCell>
                            <TableCell className="text-white">{item.descricao}</TableCell>
                            <TableCell className="text-slate-300">{item.categoria}</TableCell>
                            <TableCell className="font-mono text-white">
                              {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-slate-500 hover:text-brand-red"
                              >
                                <Trash2 size={14} />
                              </Button>
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
