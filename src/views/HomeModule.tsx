/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CheckCircle, Home, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency } from "../lib/utils";
import { Transaction, TransactionStatus, TransactionSubcategory, TransactionType } from "../types";

export default function HomeModule() {
  const { updateTransaction } = useFinance();
  const { currentPeriodLabel, transactions } = useFinanceStats();
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
  const [editedBillAmount, setEditedBillAmount] = useState("");
  const [billEditorError, setBillEditorError] = useState("");

  const homeTransactions = transactions.filter(
    (transaction) => transaction.subcategory === TransactionSubcategory.HOME
  );
  const totalSpent = homeTransactions
    .filter(
      (transaction) =>
        transaction.type === TransactionType.EXPENSE &&
        transaction.status !== TransactionStatus.CANCELLED
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categories = Array.from(new Set(homeTransactions.map((transaction) => transaction.category)));
  const categoryData = categories
    .map((category) => ({
      name: category,
      value: homeTransactions
        .filter(
          (transaction) =>
            transaction.category === category && transaction.type === TransactionType.EXPENSE
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter((category) => category.value > 0)
    .sort((left, right) => right.value - left.value);

  const pendingBills = homeTransactions.filter(
    (transaction) =>
      transaction.status === TransactionStatus.PENDING &&
      transaction.type === TransactionType.EXPENSE
  );

  const colors = ["#00FF9D", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#10B981"];

  const closeBillEditor = () => {
    setSelectedBill(null);
    setEditedBillAmount("");
    setBillEditorError("");
  };

  const openBillEditor = (bill: Transaction) => {
    setSelectedBill(bill);
    setEditedBillAmount(String(bill.amount));
    setBillEditorError("");
  };

  const markAsPaid = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (transaction) {
      updateTransaction({ ...transaction, status: TransactionStatus.PAID });
    }
  };

  const saveSelectedBill = (statusOverride?: TransactionStatus) => {
    if (!selectedBill) {
      return;
    }

    const parsedAmount = Number(editedBillAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setBillEditorError("Informe um valor valido para a conta.");
      return;
    }

    try {
      updateTransaction({
        ...selectedBill,
        amount: parsedAmount,
        status: statusOverride ?? selectedBill.status,
      });
      closeBillEditor();
    } catch (caughtError) {
      setBillEditorError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel atualizar esta conta agora."
      );
    }
  };

  const handlePendingBillKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    bill: Transaction
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openBillEditor(bill);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="trading-card flex-1 min-w-0">
          <div className="mb-6 flex items-center gap-2 font-bold text-white">
            <Home className="text-purple-400" /> Custo de Vida Pessoal
          </div>
          <p className="-mt-4 mb-4 text-xs text-slate-500">Periodo ativo: {currentPeriodLabel}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{formatCurrency(totalSpent)}</span>
            <span className="text-xs font-medium uppercase text-slate-500">Gastos Totais (Periodo)</span>
          </div>

          <div className="mt-8 h-64 min-h-[240px] w-full min-w-0 overflow-hidden">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#15171C", border: "1px solid #22252B", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "12px", fontFamily: "JetBrains Mono" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Nenhuma despesa residencial disponivel para o grafico.
              </div>
            )}
          </div>
        </div>

        <div className="trading-card flex w-full flex-col md:w-96">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-white">
            <Zap className="text-brand-yellow" size={18} /> Contas Pendentes
          </h3>
          <div className="max-h-[350px] flex-1 space-y-3 overflow-y-auto pr-2">
            {pendingBills.length === 0 && (
              <div className="py-10 text-center">
                <CheckCircle className="mx-auto mb-2 text-brand-green" />
                <p className="text-sm text-slate-500">Tudo em dia!</p>
              </div>
            )}
            {pendingBills.map((bill) => (
              <div
                key={bill.id}
                role="button"
                tabIndex={0}
                onClick={() => openBillEditor(bill)}
                onKeyDown={(event) => handlePendingBillKeyDown(event, bill)}
                className="group w-full rounded-lg border border-brand-border bg-slate-900 p-3 text-left transition-colors hover:border-brand-green/30 hover:bg-slate-800/90"
              >
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-medium text-white">{bill.description}</span>
                  <span className="text-xs text-brand-red">{formatCurrency(bill.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {bill.date}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markAsPaid(bill.id);
                    }}
                    className="inline-flex min-h-8 items-center rounded-full border border-brand-green/30 bg-brand-green/10 px-3 text-[10px] font-bold uppercase tracking-tighter text-brand-green transition-colors hover:border-brand-green hover:bg-brand-green/20 hover:underline"
                  >
                    Marcar Pago
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Toque na conta para ajustar o valor, como juros ou multa.
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-brand-border pt-4 text-center">
            <p className="text-xs text-slate-500">
              Total pendente:{" "}
              <span className="text-brand-yellow">{formatCurrency(pendingBills.reduce((sum, bill) => sum + bill.amount, 0))}</span>
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedBill && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeBillEditor}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="relative w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-brand-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Conta Pendente</h3>
                  <p className="mt-1 text-sm text-slate-400">{selectedBill.description}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">
                    {selectedBill.date} - {selectedBill.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeBillEditor}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  aria-label="Fechar editor da conta"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Valor atualizado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedBillAmount}
                    onChange={(event) => {
                      setEditedBillAmount(event.target.value);
                      if (billEditorError) {
                        setBillEditorError("");
                      }
                    }}
                    className="w-full rounded-xl border border-brand-border bg-slate-900 px-4 py-3 font-mono text-white focus:border-brand-green focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Use este campo para ajustar juros, multa ou qualquer diferenca no valor.
                  </p>
                </div>

                {billEditorError && (
                  <div className="rounded-xl border border-brand-red/20 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
                    {billEditorError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button type="button" onClick={closeBillEditor} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => saveSelectedBill()} className="btn-primary">
                    Salvar Valor
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSelectedBill(TransactionStatus.PAID)}
                    className="rounded-lg border border-brand-green/30 bg-brand-green/10 px-4 py-2 font-semibold text-brand-green transition-colors hover:border-brand-green hover:bg-brand-green/20"
                  >
                    Marcar Pago
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="trading-card">
        <h3 className="mb-6 font-bold text-white">Sugestao de Alocacao</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border-l-4 border-brand-green bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Essencial (50%)</p>
            <p className="text-sm font-medium text-white">Luz, Agua, Aluguel</p>
          </div>
          <div className="rounded-xl border-l-4 border-blue-500 bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Desejos (30%)</p>
            <p className="text-sm font-medium text-white">Lazer, Restaurantes</p>
          </div>
          <div className="rounded-xl border-l-4 border-brand-yellow bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Dividas/Poup. (20%)</p>
            <p className="text-sm font-medium text-white">Investimentos, Reservas</p>
          </div>
          <div className="flex items-center justify-center rounded-xl border border-brand-green/20 bg-brand-green/5 p-4">
            <p className="text-center text-xs font-bold text-brand-green">Analise sua alocacao no modulo IA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
