/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, Shield, Bell, Zap, Download, Database, RotateCcw, Save } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { cn } from "../lib/utils";

export default function Settings() {
  const { state, dispatch } = useFinance();

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `nexus-finance-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetAll = () => {
    if (confirm("ATENÇÃO: Isso apagará TODOS os dados permanentemente. Confirma?")) {
      if (confirm("Você tem certeza ABSOLUTA? Esta ação não pode ser desfeita.")) {
        dispatch({ type: "RESET_STATE" });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile */}
      <section className="trading-card">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-brand-border">
          <User className="text-brand-green" />
          <h3 className="text-xl font-bold text-white">Perfil do Operador</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Seu Nome</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white focus:border-brand-green"
              value={state.profile.nome}
              onChange={e => dispatch({ type: "UPDATE_PROFILE", payload: { nome: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da Loja / MEI</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white focus:border-brand-green"
              value={state.profile.loja}
              onChange={e => dispatch({ type: "UPDATE_PROFILE", payload: { loja: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Meta de Faturamento Mensal (R$)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-brand-border rounded-lg px-4 py-2 text-white font-mono focus:border-brand-green"
              value={state.profile.meta}
              onChange={e => dispatch({ type: "UPDATE_PROFILE", payload: { meta: parseFloat(e.target.value) } })}
            />
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="trading-card">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-brand-border">
          <Zap className="text-brand-yellow" />
          <h3 className="text-xl font-bold text-white">Preferências do Sistema</h3>
        </div>

        <div className="space-y-4">
          {[
            { id: "mostrarCentavos", label: "Exibir centavos nos valores", icon: Shield },
            { id: "incluirPendentesNoSaldo", label: "Incluir lançamentos pendentes no saldo total", icon: Database },
            { id: "ativarAlertas", label: "Ativar alertas de risco financeiro", icon: Bell },
            { id: "animacoes", label: "Ativar animações de interface", icon: Zap },
          ].map((pref) => (
            <div 
              key={pref.id}
              onClick={() => dispatch({ type: "UPDATE_PREFERENCES", payload: { [pref.id]: !state.preferences[pref.id as keyof typeof state.preferences] } })}
              className="flex items-center justify-between p-4 bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-800 transition-all border border-transparent hover:border-brand-border group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700">
                  <pref.icon size={18} className="text-slate-400 group-hover:text-white" />
                </div>
                <span className="text-sm font-medium text-slate-300">{pref.label}</span>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-all",
                state.preferences[pref.id as keyof typeof state.preferences] ? "bg-brand-green" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  state.preferences[pref.id as keyof typeof state.preferences] ? "left-7" : "left-1"
                )} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Backup & Danger */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="trading-card border-brand-green/20">
          <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Download size={18} className="text-brand-green" /> Backup de Dados</h4>
          <p className="text-xs text-slate-500 mb-6">Exporte todos os seus dados e configurações em um arquivo JSON para segurança.</p>
          <button onClick={handleExportBackup} className="w-full btn-primary flex items-center justify-center gap-2">
            <Save size={18} /> Exportar Backup (JSON)
          </button>
        </div>

        <div className="trading-card border-brand-red/20">
          <h4 className="text-brand-red font-bold mb-4 flex items-center gap-2"><RotateCcw size={18} /> Zona de Perigo</h4>
          <p className="text-xs text-slate-500 mb-6">Limpar todos os dados do sistema. Esta ação exigirá confirmação dupla e não pode ser revertida.</p>
          <button onClick={resetAll} className="w-full bg-transparent border border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-all py-2 rounded-lg font-bold">
            Resetar Sistema Nexus
          </button>
        </div>
      </section>
    </div>
  );
}
