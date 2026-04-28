/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import TransactionFormModal from "../features/transactions/TransactionFormModal";
import {
  formatSignedCurrency,
  formatTransactionStatusLabel,
  formatTransactionTypeLabel,
} from "../features/transactions/transactionForm";
import {
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../types";
import { cn } from "../lib/utils";

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "todos">("todos");
  const [filterSub, setFilterSub] = useState<TransactionSubcategory | "todos">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const deleteTransaction = (id: string) => {
    if (confirm("Deseja realmente excluir este lancamento?")) {
      dispatch({ type: "DELETE_TRANSACTION", payload: id });
    }
  };

  const handleTransactionRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    transaction: Transaction
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openEdit(transaction);
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
                <th className="px-4 py-2 text-center">Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  role="button"
                  tabIndex={0}
                  title={`Editar lancamento ${transaction.description}`}
                  onClick={() => openEdit(transaction)}
                  onKeyDown={(event) => handleTransactionRowKeyDown(event, transaction)}
                  className="group cursor-pointer transition-colors hover:bg-slate-800/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-green/60"
                >
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
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteTransaction(transaction.id);
                        }}
                        aria-label={`Excluir lancamento ${transaction.description}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-border bg-slate-900/70 text-slate-300 transition-colors hover:border-brand-red/30 hover:bg-brand-red/10 hover:text-brand-red"
                      >
                        <Trash2 size={14} />
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
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        transactionToEdit={editingTransaction}
      />
    </div>
  );
}
