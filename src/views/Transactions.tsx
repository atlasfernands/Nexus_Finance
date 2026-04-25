/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Check, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFinance } from "../features/finance/FinanceContext";
import { DuplicateTransactionMatch, findDuplicateTransaction } from "../lib/transactionDuplicates";
import {
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../types";
import { cn, formatCurrency, generateId } from "../lib/utils";

function formatTransactionTypeLabel(type: TransactionType) {
  return type === TransactionType.INCOME ? "Entrada" : "Saida";
}

function formatTransactionStatusLabel(status: TransactionStatus) {
  if (status === TransactionStatus.PAID) {
    return "Pago";
  }

  if (status === TransactionStatus.PENDING) {
    return "Pendente";
  }

  if (status === TransactionStatus.CANCELLED) {
    return "Cancelado";
  }

  return "Realizado";
}

function formatSignedCurrency(value: number, isNegative: boolean) {
  const formatted = formatCurrency(Math.abs(value));
  return isNegative ? `(${formatted})` : formatted;
}

function createDefaultFormData(): Partial<Transaction> {
  return {
    description: "",
    amount: 0,
    type: TransactionType.EXPENSE,
    subcategory: TransactionSubcategory.HOME,
    status: TransactionStatus.PENDING,
    date: new Date().toLocaleDateString("pt-BR"),
    category: "Outros",
    recurring: false,
  };
}

export default function Transactions() {
  const { addTransaction, state, dispatch, updateTransaction } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "todos">("todos");
  const [filterSub, setFilterSub] = useState<TransactionSubcategory | "todos">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>(createDefaultFormData);
  const [formError, setFormError] = useState("");
  const [duplicateReview, setDuplicateReview] = useState<DuplicateTransactionMatch | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter((transaction) => {
      const matchSearch =
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === "todos" || transaction.type === filterType;
      const matchSub = filterSub === "todos" || transaction.subcategory === filterSub;

      return matchSearch && matchType && matchSub;
    });
  }, [filterSub, filterType, searchTerm, state.transactions]);

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData(createDefaultFormData());
    setFormError("");
    setDuplicateReview(null);
    setPendingTransaction(null);
  };

  const updateForm = (patch: Partial<Transaction>) => {
    if (formError) {
      setFormError("");
    }

    if (duplicateReview) {
      setDuplicateReview(null);
      setPendingTransaction(null);
    }

    setFormData((current) => ({ ...current, ...patch }));
  };

  const getCurrentDuplicate = (transaction: Transaction) =>
    findDuplicateTransaction(transaction, state.transactions, {
      ignoreId: editingTransaction?.id,
    });

  const persistTransaction = (transaction: Transaction, allowDuplicate = false) => {
    if (editingTransaction) {
      updateTransaction(transaction, { allowDuplicate });
      return;
    }

    addTransaction(transaction, { allowDuplicate });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount)) {
      return;
    }

    const transaction: Transaction = {
      ...(formData as Transaction),
      id: editingTransaction?.id || generateId(),
      amount,
    };

    const duplicate = getCurrentDuplicate(transaction);

    if (duplicate) {
      setDuplicateReview(duplicate);
      setPendingTransaction(transaction);
      setFormError("");
      return;
    }

    try {
      persistTransaction(transaction);
      setIsModalOpen(false);
      resetForm();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o lancamento agora."
      );
    }
  };

  const confirmDuplicateSave = () => {
    if (!pendingTransaction) {
      return;
    }

    try {
      persistTransaction(pendingTransaction, true);
      setIsModalOpen(false);
      resetForm();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o lancamento agora."
      );
    }
  };

  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData(transaction);
    setFormError("");
    setIsModalOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const deleteTransaction = (id: string) => {
    if (confirm("Deseja realmente excluir este lancamento?")) {
      dispatch({ type: "DELETE_TRANSACTION", payload: id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-card p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por descricao ou categoria..."
            className="w-full rounded-lg border border-brand-border bg-slate-900 py-2 pl-10 pr-4 text-slate-200 transition-all focus:border-brand-green focus:outline-none"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto">
          <select
            className="min-w-0 rounded-lg border border-brand-border bg-slate-900 px-3 py-2 text-sm text-slate-200"
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as TransactionType | "todos")}
          >
            <option value="todos">Todos Tipos</option>
            <option value={TransactionType.INCOME}>Entradas</option>
            <option value={TransactionType.EXPENSE}>Saidas</option>
          </select>
          <select
            className="min-w-0 rounded-lg border border-brand-border bg-slate-900 px-3 py-2 text-sm text-slate-200"
            value={filterSub}
            onChange={(event) => setFilterSub(event.target.value as TransactionSubcategory | "todos")}
          >
            <option value="todos">Casa e Loja</option>
            <option value={TransactionSubcategory.HOME}>Casa</option>
            <option value={TransactionSubcategory.STORE}>Loja</option>
          </select>
          <button
            onClick={openCreate}
            className="btn-primary flex w-full items-center justify-center gap-2 whitespace-nowrap sm:col-span-2 xl:w-auto"
          >
            <Plus size={18} /> Novo Lancamento
          </button>
        </div>
      </div>

      <div className="trading-card overflow-hidden">
        <div className="overflow-x-auto pb-4">
          <table className="min-w-[980px] w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-brand-border text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Descricao</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Valor (R$)</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Saldo Acumulado (R$)</th>
                <th className="px-4 py-2 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="group transition-colors hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-slate-400">{transaction.date}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{transaction.description}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{transaction.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                        transaction.type === TransactionType.INCOME
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-brand-red/10 text-brand-red"
                      )}
                    >
                      {formatTransactionTypeLabel(transaction.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <span className={transaction.type === TransactionType.INCOME ? "text-brand-green" : "text-white"}>
                      {formatSignedCurrency(transaction.amount, transaction.type === TransactionType.EXPENSE)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-[10px] font-bold",
                        transaction.status === TransactionStatus.PAID ||
                          transaction.status === TransactionStatus.COMPLETED
                          ? "bg-brand-green/10 text-brand-green"
                          : transaction.status === TransactionStatus.PENDING
                            ? "bg-brand-yellow/10 text-brand-yellow"
                            : "bg-brand-red/10 text-brand-red"
                      )}
                    >
                      {formatTransactionStatusLabel(transaction.status)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {typeof transaction.runningBalance === "number"
                      ? formatSignedCurrency(transaction.runningBalance, transaction.runningBalance < 0)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(transaction)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-brand-red/10 hover:text-brand-red"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center italic text-slate-500">
              Nenhum lancamento encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between border-b border-brand-border pb-4">
                <h3 className="text-xl font-bold tracking-tight text-white">
                  {editingTransaction ? "Editar Lancamento" : "Novo Lancamento"}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Descricao</label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
                      value={formData.description ?? ""}
                      onChange={(event) => updateForm({ description: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Valor</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 font-mono text-white focus:border-brand-green"
                      value={formData.amount ?? ""}
                      onChange={(event) =>
                        updateForm({
                          amount: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Data</label>
                    <input
                      required
                      type="text"
                      placeholder="DD/MM/YYYY"
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 font-mono text-white focus:border-brand-green"
                      value={formData.date ?? ""}
                      onChange={(event) => updateForm({ date: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo</label>
                    <select
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white"
                      value={formData.type}
                      onChange={(event) =>
                        updateForm({ type: event.target.value as TransactionType })
                      }
                    >
                      <option value={TransactionType.EXPENSE}>Saida (-)</option>
                      <option value={TransactionType.INCOME}>Entrada (+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Subcategoria</label>
                    <select
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white"
                      value={formData.subcategory}
                      onChange={(event) =>
                        updateForm({
                          subcategory: event.target.value as TransactionSubcategory,
                        })
                      }
                    >
                      <option value={TransactionSubcategory.HOME}>Casa</option>
                      <option value={TransactionSubcategory.STORE}>Loja (MEI)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                    <select
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white"
                      value={formData.status}
                      onChange={(event) =>
                        updateForm({ status: event.target.value as TransactionStatus })
                      }
                    >
                      <option value={TransactionStatus.PENDING}>Pendente</option>
                      <option value={TransactionStatus.PAID}>Pago / Recebido</option>
                      <option value={TransactionStatus.COMPLETED}>Confirmado</option>
                      <option value={TransactionStatus.CANCELLED}>Cancelado</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Categoria</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
                      value={formData.category ?? ""}
                      onChange={(event) => updateForm({ category: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Recorrente?</label>
                    <button
                      type="button"
                      onClick={() => updateForm({ recurring: !formData.recurring })}
                      aria-pressed={Boolean(formData.recurring)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white",
                        formData.recurring && "border-brand-green bg-brand-green/5"
                      )}
                    >
                      <span>{formData.recurring ? "Sim" : "Nao"}</span>
                      {formData.recurring && <Check size={16} className="text-brand-green" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg border border-brand-red/20 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
                    {formError}
                  </div>
                )}

                {duplicateReview && pendingTransaction && (
                  <div className="space-y-4 rounded-lg border border-brand-yellow/30 bg-brand-yellow/5 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-brand-yellow">Possivel duplicado no mesmo mes</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Encontramos um lancamento muito parecido no periodo. Revise abaixo e escolha se quer manter os dois.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-brand-border bg-slate-900/70 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ja existente</p>
                        <p className="mt-2 text-sm font-medium text-white">{duplicateReview.duplicateOf.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{duplicateReview.duplicateOf.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {duplicateReview.duplicateOf.subcategory} - {duplicateReview.duplicateOf.category}
                        </p>
                        <p className="mt-3 font-mono text-sm text-brand-yellow">
                          {formatCurrency(duplicateReview.duplicateOf.amount)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Novo lancamento</p>
                        <p className="mt-2 text-sm font-medium text-white">{pendingTransaction.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{pendingTransaction.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {pendingTransaction.subcategory} - {pendingTransaction.category}
                        </p>
                        <p className="mt-3 font-mono text-sm text-brand-green">
                          {formatCurrency(pendingTransaction.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateReview(null);
                          setPendingTransaction(null);
                        }}
                        className="btn-secondary flex-1"
                      >
                        Revisar Dados
                      </button>
                      <button type="button" onClick={confirmDuplicateSave} className="btn-primary flex-1">
                        Manter Mesmo Assim
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    Salvar Lancamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
