/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Check, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFinance } from "../features/finance/FinanceContext";
import {
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../types";
import { cn, formatCurrency, generateId } from "../lib/utils";

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
  const { state, dispatch } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "todos">("todos");
  const [filterSub, setFilterSub] = useState<TransactionSubcategory | "todos">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>(createDefaultFormData);

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

    if (editingTransaction) {
      dispatch({ type: "UPDATE_TRANSACTION", payload: transaction });
    } else {
      dispatch({ type: "ADD_TRANSACTION", payload: transaction });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData(transaction);
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
          <table className="min-w-[700px] w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-brand-border text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Descricao</th>
                <th className="hidden px-4 py-2 md:table-cell">Sistema</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="group transition-colors hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold",
                        transaction.status === TransactionStatus.PAID ||
                          transaction.status === TransactionStatus.COMPLETED
                          ? "bg-brand-green/10 text-brand-green"
                          : transaction.status === TransactionStatus.PENDING
                            ? "bg-brand-yellow/10 text-brand-yellow"
                            : "bg-brand-red/10 text-brand-red"
                      )}
                    >
                      {transaction.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{transaction.description}</span>
                      <span className="text-[10px] uppercase text-slate-500">{transaction.category}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter",
                        transaction.subcategory === TransactionSubcategory.STORE
                          ? "bg-[#2D3E50] text-[#7EB6FF]"
                          : "bg-[#3E2D50] text-[#D1AFFF]"
                      )}
                    >
                      {transaction.subcategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{transaction.date}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1",
                        transaction.type === TransactionType.INCOME ? "text-brand-green" : "text-white"
                      )}
                    >
                      {transaction.type === TransactionType.INCOME ? "+" : "-"} {formatCurrency(transaction.amount)}
                    </div>
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
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
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
                        setFormData({
                          ...formData,
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
                      onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo</label>
                    <select
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white"
                      value={formData.type}
                      onChange={(event) =>
                        setFormData({ ...formData, type: event.target.value as TransactionType })
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
                        setFormData({
                          ...formData,
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
                        setFormData({ ...formData, status: event.target.value as TransactionStatus })
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
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Recorrente?</label>
                    <div
                      onClick={() => setFormData({ ...formData, recurring: !formData.recurring })}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white",
                        formData.recurring && "border-brand-green bg-brand-green/5"
                      )}
                    >
                      <span>{formData.recurring ? "Sim" : "Nao"}</span>
                      {formData.recurring && <Check size={16} className="text-brand-green" />}
                    </div>
                  </div>
                </div>

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
