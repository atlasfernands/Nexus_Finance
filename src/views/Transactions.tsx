/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Plus, Search, Filter, Trash2, Edit2, ArrowUpRight, ArrowDownLeft, X, Check, MoreVertical } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { Transaction, TransactionType, TransactionStatus, TransactionSubcategory } from "../types";
import { formatCurrency, generateId, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "todos">("todos");
  const [filterSub, setFilterSub] = useState<TransactionSubcategory | "todos">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    descricao: "",
    valor: 0,
    tipo: "saída",
    subcategoria: "Casa",
    status: "pendente",
    data: new Date().toLocaleDateString('pt-BR'),
    categoria: "Outros",
    recorrente: false
  });

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      const matchSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === "todos" || t.tipo === filterType;
      const matchSub = filterSub === "todos" || t.subcategoria === filterSub;
      return matchSearch && matchType && matchSub;
    });
  }, [state.transactions, searchTerm, filterType, filterSub]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const transaction: Transaction = {
      ...formData as Transaction,
      id: editingTransaction?.id || generateId(),
    };

    if (editingTransaction) {
      dispatch({ type: "UPDATE_TRANSACTION", payload: transaction });
    } else {
      dispatch({ type: "ADD_TRANSACTION", payload: transaction });
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormData({
      descricao: "", valor: 0, tipo: "saída", subcategoria: "Casa", 
      status: "pendente", data: new Date().toLocaleDateString('pt-BR'),
      categoria: "Outros", recorrente: false
    });
  };

  const openEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData(t);
    setIsModalOpen(true);
  };

  const deleteTransaction = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      dispatch({ type: "DELETE_TRANSACTION", payload: id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-brand-card p-4 rounded-xl border border-brand-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou categoria..." 
            className="w-full bg-slate-900 border border-brand-border rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-brand-green transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select 
            className="bg-slate-900 border border-brand-border rounded-lg px-3 py-2 text-slate-200 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="todos">Todos Tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saída">Saídas</option>
          </select>
          <select 
            className="bg-slate-900 border border-brand-border rounded-lg px-3 py-2 text-slate-200 text-sm"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value as any)}
          >
            <option value="todos">Casa & Loja</option>
            <option value="Casa">Casa</option>
            <option value="Loja">Loja</option>
          </select>
          <button 
            onClick={() => { setIsModalOpen(true); setEditingTransaction(null); }}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="trading-card overflow-hidden">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-[700px] text-[12px]">
            <thead>
              <tr className="border-b border-brand-border text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Descrição</th>
                <th className="py-2 px-4 md:table-cell hidden">Sistema</th>
                <th className="py-2 px-4">Data</th>
                <th className="py-2 px-4 text-right">Valor</th>
                <th className="py-2 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              <AnimatePresence>
                {filteredTransactions.map((t) => (
                  <motion.tr 
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded",
                        t.status === "pago" || t.status === "realizado" ? "text-brand-green bg-brand-green/10" :
                        t.status === "pendente" ? "text-brand-yellow bg-brand-yellow/10" : "text-brand-red bg-brand-red/10"
                      )}>
                        {t.status.toUpperCase()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{t.descricao}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{t.categoria}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 md:table-cell hidden">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded",
                        t.subcategoria === "Loja" ? "bg-[#2D3E50] text-[#7EB6FF]" : "bg-[#3E2D50] text-[#D1AFFF]"
                      )}>{t.subcategoria}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{t.data}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <div className={cn(
                        "flex items-center justify-end gap-1",
                        t.tipo === "entrada" ? "text-brand-green" : "text-white"
                      )}>
                        {t.tipo === "entrada" ? "+" : "-"} {formatCurrency(t.valor)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-brand-red/10 rounded"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center text-slate-500 italic">
              Nenhum lançamento encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 border-b border-brand-border pb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white focus:border-brand-green"
                      value={formData.descricao}
                      onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor</label>
                    <input 
                      required
                      type="number" step="0.01"
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white font-mono focus:border-brand-green"
                      value={formData.valor}
                      onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data</label>
                    <input 
                      required
                      type="text" placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white font-mono focus:border-brand-green"
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                    <select 
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white"
                      value={formData.tipo}
                      onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                    >
                      <option value="saída">Saída (-)</option>
                      <option value="entrada">Entrada (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Subcategoria</label>
                    <select 
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white"
                      value={formData.subcategoria}
                      onChange={e => setFormData({ ...formData, subcategoria: e.target.value as any })}
                    >
                      <option value="Casa">Casa</option>
                      <option value="Loja">Loja (MEI)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
                    <select 
                      className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago / Recebido</option>
                      <option value="realizado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Recorrente?</label>
                    <div 
                      onClick={() => setFormData({ ...formData, recorrente: !formData.recorrente })}
                      className={cn(
                        "w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white cursor-pointer flex items-center justify-between",
                        formData.recorrente && "border-brand-green bg-brand-green/5"
                      )}
                    >
                      <span>{formData.recorrente ? "Sim" : "Não"}</span>
                      {formData.recorrente && <Check size={16} className="text-brand-green" />}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">Cancelar</button>
                  <button type="submit" className="flex-1 btn-primary">Salvar Lançamento</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
