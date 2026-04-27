/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Bell, Database, Download, ExternalLink, RotateCcw, Save, Shield, Smartphone, User, Zap } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { hasAndroidApkRelease, mobileRelease } from "../lib/mobileRelease";
import { cn } from "../lib/utils";

const preferenceItems = [
  { id: "showCents", label: "Exibir centavos nos valores", icon: Shield },
  { id: "includePendingInBalance", label: "Incluir lancamentos pendentes no saldo total", icon: Database },
  { id: "enableAlerts", label: "Ativar alertas de risco financeiro", icon: Bell },
  { id: "animations", label: "Ativar animacoes de interface", icon: Zap },
] as const;

export default function Settings() {
  const { state, dispatch } = useFinance();

  const handleExportBackup = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state))}`;
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `nexus-finance-backup-${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetAll = () => {
    if (confirm("ATENCAO: Isso apagara TODOS os dados permanentemente. Confirma?")) {
      if (confirm("Voce tem certeza absoluta? Esta acao nao pode ser desfeita.")) {
        dispatch({ type: "RESET_STATE" });
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="trading-card">
        <div className="mb-8 flex items-center gap-3 border-b border-brand-border pb-4">
          <User className="text-brand-green" />
          <h3 className="text-xl font-bold text-white">Perfil do Operador</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Seu Nome</label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
              value={state.profile.name}
              onChange={(event) =>
                dispatch({ type: "UPDATE_PROFILE", payload: { name: event.target.value } })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Nome da Loja / MEI
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 text-white focus:border-brand-green"
              value={state.profile.store}
              onChange={(event) =>
                dispatch({ type: "UPDATE_PROFILE", payload: { store: event.target.value } })
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Meta de Faturamento Mensal (R$)
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-brand-border bg-slate-900 px-4 py-2 font-mono text-white focus:border-brand-green"
              value={state.profile.goal}
              onChange={(event) => {
                const parsedGoal = event.target.value === "" ? 0 : Number(event.target.value);
                dispatch({
                  type: "UPDATE_PROFILE",
                  payload: { goal: Number.isFinite(parsedGoal) ? parsedGoal : 0 },
                });
              }}
            />
          </div>
        </div>
      </section>

      <section className="trading-card">
        <div className="mb-8 flex items-center gap-3 border-b border-brand-border pb-4">
          <Zap className="text-brand-yellow" />
          <h3 className="text-xl font-bold text-white">Preferencias do Sistema</h3>
        </div>

        <div className="space-y-4">
          {preferenceItems.map((preference) => (
            <div
              key={preference.id}
              onClick={() =>
                dispatch({
                  type: "UPDATE_PREFERENCES",
                  payload: {
                    [preference.id]: !state.preferences[preference.id],
                  },
                })
              }
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent bg-slate-900 p-4 transition-all hover:border-brand-border hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2 group-hover:bg-slate-700">
                  <preference.icon size={18} className="text-slate-400 group-hover:text-white" />
                </div>
                <span className="text-sm font-medium text-slate-300">{preference.label}</span>
              </div>
              <div
                className={cn(
                  "relative h-6 w-12 rounded-full transition-all",
                  state.preferences[preference.id] ? "bg-brand-green" : "bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                    state.preferences[preference.id] ? "left-7" : "left-1"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="trading-card border-brand-green/20">
        <div className="mb-8 flex items-center gap-3 border-b border-brand-border pb-4">
          <Smartphone className="text-brand-green" />
          <h3 className="text-xl font-bold text-white">App Mobile</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-brand-border bg-slate-950/50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-bold text-white">Android APK</h4>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                  hasAndroidApkRelease
                    ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                    : "border-brand-yellow/40 bg-brand-yellow/10 text-brand-yellow"
                )}
              >
                {hasAndroidApkRelease ? "Teste disponivel" : "Em preparacao"}
              </span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-400">
              {hasAndroidApkRelease
                ? `APK Android de teste pronto para instalar. Versao ${mobileRelease.android.version}, atualizado em ${mobileRelease.android.updatedAt}.`
                : "O app Android nativo esta sendo preparado com Capacitor. Quando houver um APK assinado, este card vira o ponto oficial de download."}
            </p>
            {hasAndroidApkRelease ? (
              <a
                href={mobileRelease.android.apkUrl}
                download
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Download size={18} /> Baixar APK Android
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-brand-border bg-slate-900 px-4 py-2 font-semibold text-slate-500"
              >
                <Download size={18} /> APK em preparacao
              </button>
            )}
          </div>

          <div className="rounded-xl border border-brand-border bg-slate-950/50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-bold text-white">iOS e PWA</h4>
              <span className="rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-green">
                Gratis agora
              </span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-400">
              No iPhone, a rota gratis e instalar pelo Safari usando Adicionar a Tela de Inicio. A App Store fica para a fase
              paga com conta Apple Developer.
            </p>
            <a
              href={mobileRelease.pwaGuideUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex w-full items-center justify-center gap-2"
            >
              <ExternalLink size={18} /> Ver guia de instalacao
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="trading-card border-brand-green/20">
          <h4 className="mb-4 flex items-center gap-2 font-bold text-white">
            <Download size={18} className="text-brand-green" /> Backup de Dados
          </h4>
          <p className="mb-6 text-xs text-slate-500">
            Exporte todos os seus dados e configuracoes em um arquivo JSON para seguranca.
          </p>
          <button onClick={handleExportBackup} className="btn-primary flex w-full items-center justify-center gap-2">
            <Save size={18} /> Exportar Backup (JSON)
          </button>
        </div>

        <div className="trading-card border-brand-red/20">
          <h4 className="mb-4 flex items-center gap-2 font-bold text-brand-red">
            <RotateCcw size={18} /> Zona de Perigo
          </h4>
          <p className="mb-6 text-xs text-slate-500">
            Limpar todos os dados do sistema. Esta acao exigira confirmacao dupla e nao pode ser revertida.
          </p>
          <button
            onClick={resetAll}
            className="w-full rounded-lg border border-brand-red bg-transparent py-2 font-bold text-brand-red transition-all hover:bg-brand-red hover:text-white"
          >
            Resetar Sistema Nexus
          </button>
        </div>
      </section>
    </div>
  );
}
