import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFinance } from "../finance/FinanceContext";
import {
  expandRecurringTransactions,
  RECURRING_MONTHS_AHEAD,
} from "./recurringTransactions";
import {
  createDefaultFormData,
  formatSignedCurrency,
  hasMemoryMatch,
} from "./transactionForm";
import {
  DuplicateTransactionMatch,
  findDuplicateTransaction,
  partitionTransactionsByDuplicates,
} from "../../lib/transactionDuplicates";
import {
  Transaction,
  TransactionStatus,
  TransactionSubcategory,
  TransactionType,
} from "../../types";
import { cn, formatCurrency, generateId } from "../../lib/utils";

interface TransactionFormModalProps {
  defaultValues?: Partial<Transaction>;
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export default function TransactionFormModal({
  defaultValues,
  isOpen,
  onClose,
  transactionToEdit = null,
}: TransactionFormModalProps) {
  const { addTransaction, addTransactions, state, updateTransaction } = useFinance();
  const categoryOptions = state.transactionMemory.categories;
  const descriptionOptions = state.transactionMemory.descriptions;

  const [formData, setFormData] = useState<Partial<Transaction>>(createDefaultFormData);
  const [formError, setFormError] = useState("");
  const [duplicateReview, setDuplicateReview] = useState<DuplicateTransactionMatch[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [categoryMode, setCategoryMode] = useState<"select" | "create">("select");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextFormData = transactionToEdit ?? { ...createDefaultFormData(), ...defaultValues };

    setFormData(nextFormData);
    setFormError("");
    setDuplicateReview([]);
    setPendingTransactions([]);
    setCategoryMode(hasMemoryMatch(categoryOptions, nextFormData.category ?? "Outros") ? "select" : "create");
  }, [categoryOptions, defaultValues, isOpen, transactionToEdit]);

  const updateForm = (patch: Partial<Transaction>) => {
    if (formError) {
      setFormError("");
    }

    if (duplicateReview.length > 0) {
      setDuplicateReview([]);
      setPendingTransactions([]);
    }

    setFormData((current) => ({ ...current, ...patch }));
  };

  const getPendingDuplicates = (transactions: Transaction[]) => {
    if (transactionToEdit) {
      const duplicate = findDuplicateTransaction(transactions[0], state.transactions, {
        ignoreId: transactionToEdit.id,
      });

      return duplicate ? [duplicate] : [];
    }

    return partitionTransactionsByDuplicates(transactions, state.transactions).duplicates;
  };

  const buildTransactionsToPersist = (transaction: Transaction) => {
    if (transactionToEdit) {
      return [transaction];
    }

    return expandRecurringTransactions(transaction);
  };

  const persistTransactions = (transactions: Transaction[], allowDuplicate = false) => {
    if (transactionToEdit) {
      updateTransaction(transactions[0], { allowDuplicate });
      return;
    }

    if (transactions.length === 1) {
      addTransaction(transactions[0], { allowDuplicate });
      return;
    }

    addTransactions(transactions, { allowDuplicate });
  };

  const closeModal = () => {
    onClose();
    setFormError("");
    setDuplicateReview([]);
    setPendingTransactions([]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount)) {
      return;
    }

    const transaction: Transaction = {
      ...(formData as Transaction),
      id: transactionToEdit?.id || generateId(),
      amount,
    };

    const transactionsToPersist = buildTransactionsToPersist(transaction);
    const duplicates = getPendingDuplicates(transactionsToPersist);

    if (duplicates.length > 0) {
      setDuplicateReview(duplicates);
      setPendingTransactions(transactionsToPersist);
      setFormError("");
      return;
    }

    try {
      persistTransactions(transactionsToPersist);
      closeModal();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o lancamento agora."
      );
    }
  };

  const confirmDuplicateSave = () => {
    if (pendingTransactions.length === 0) {
      return;
    }

    try {
      persistTransactions(pendingTransactions, true);
      closeModal();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o lancamento agora."
      );
    }
  };

  const hasDuplicateReview = duplicateReview.length > 0 && pendingTransactions.length > 0;
  const reviewedDuplicate = hasDuplicateReview ? duplicateReview[0] : null;
  const reviewedTransaction = reviewedDuplicate?.transaction ?? null;
  const isRecurringReview = pendingTransactions.length > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 py-4 sm:items-center sm:py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-4 shadow-2xl max-sm:min-h-[min(640px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px] sm:p-6"
          >
            <div className="mb-4 flex shrink-0 items-center justify-between border-b border-brand-border pb-4 sm:mb-6">
              <h3 className="text-xl font-bold tracking-tight text-white">
                {transactionToEdit ? "Editar Lancamento" : "Novo Lancamento"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Descricao</label>
                    <input
                      required
                      type="text"
                      list="nexus-description-memory"
                      className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
                      value={formData.description ?? ""}
                      onChange={(event) => updateForm({ description: event.target.value })}
                    />
                    <datalist id="nexus-description-memory">
                      {descriptionOptions.map((description) => (
                        <option key={description} value={description} />
                      ))}
                    </datalist>
                    {descriptionOptions.length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Comece a digitar para reutilizar uma descricao ja feita.
                      </p>
                    )}
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
                      onChange={(event) => updateForm({ type: event.target.value as TransactionType })}
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
                      onChange={(event) => updateForm({ status: event.target.value as TransactionStatus })}
                    >
                      <option value={TransactionStatus.PENDING}>Pendente</option>
                      <option value={TransactionStatus.PAID}>
                        {formData.type === TransactionType.INCOME ? "Recebido" : "Pago"}
                      </option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Novos lancamentos usam apenas status pendente ou liquidado.
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Categoria</label>
                    <div className="space-y-2">
                      <select
                        className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
                        value={categoryMode === "create" ? "__new__" : formData.category ?? "Outros"}
                        onChange={(event) => {
                          if (event.target.value === "__new__") {
                            setCategoryMode("create");
                            updateForm({ category: "" });
                            return;
                          }

                          setCategoryMode("select");
                          updateForm({ category: event.target.value });
                        }}
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="__new__">+ Criar nova categoria</option>
                      </select>

                      {categoryMode === "create" && (
                        <div className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              required
                              type="text"
                              autoFocus
                              placeholder="Nome da nova categoria"
                              className="w-full rounded-lg border border-brand-border bg-slate-950 px-4 py-2 text-white focus:border-brand-green"
                              value={formData.category ?? ""}
                              onChange={(event) => updateForm({ category: event.target.value })}
                            />
                            <button
                              type="button"
                              className="btn-secondary whitespace-nowrap"
                              onClick={() => {
                                setCategoryMode("select");
                                updateForm({ category: categoryOptions[0] ?? "Outros" });
                              }}
                            >
                              Selecionar existente
                            </button>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            Ao salvar, essa categoria fica disponivel nos proximos lancamentos da conta.
                          </p>
                        </div>
                      )}
                    </div>
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
                    <p className="mt-1 text-[11px] text-slate-500">
                      {transactionToEdit
                        ? "Ao editar, a recorrencia marca apenas esta ocorrencia. Novas copias mensais sao criadas ao cadastrar um novo lancamento recorrente."
                        : `Se marcar Sim, o sistema cria este lancamento e mais ${RECURRING_MONTHS_AHEAD} meses seguintes no mesmo dia.`}
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg border border-brand-red/20 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
                    {formError}
                  </div>
                )}

                {hasDuplicateReview && reviewedDuplicate && reviewedTransaction && (
                  <div className="space-y-4 rounded-lg border border-brand-yellow/30 bg-brand-yellow/5 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-brand-yellow">
                        {isRecurringReview ? "Possiveis duplicados na sequencia recorrente" : "Possivel duplicado no mesmo mes"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {isRecurringReview
                          ? `A sequencia vai criar ${pendingTransactions.length} lancamentos e ${duplicateReview.length} ${
                              duplicateReview.length === 1 ? "deles parece" : "deles parecem"
                            } ja existir. Mostramos abaixo a primeira ocorrencia em conflito para revisao.`
                          : "Encontramos um lancamento muito parecido no periodo. Revise abaixo e escolha se quer manter os dois."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-brand-border bg-slate-900/70 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ja existente</p>
                        <p className="mt-2 text-sm font-medium text-white">{reviewedDuplicate.duplicateOf.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{reviewedDuplicate.duplicateOf.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {reviewedDuplicate.duplicateOf.subcategory} - {reviewedDuplicate.duplicateOf.category}
                        </p>
                        <p className="mt-3 font-mono text-sm text-brand-yellow">
                          {formatCurrency(reviewedDuplicate.duplicateOf.amount)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                          {isRecurringReview ? "Ocorrencia em conflito" : "Novo lancamento"}
                        </p>
                        <p className="mt-2 text-sm font-medium text-white">{reviewedTransaction.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{reviewedTransaction.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {reviewedTransaction.subcategory} - {reviewedTransaction.category}
                        </p>
                        <p className="mt-3 font-mono text-sm text-brand-green">
                          {formatCurrency(reviewedTransaction.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateReview([]);
                          setPendingTransactions([]);
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
              </div>

              <div className="flex shrink-0 gap-3 border-t border-brand-border pt-4 sm:pt-6">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
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
  );
}
