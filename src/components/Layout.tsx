/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LayoutDashboard, ListOrdered, FileInput, BarChart3, Store, Home, Settings, Bot, Menu } from "lucide-react";
import { cn } from "../lib/utils";
import { useFinance } from "../features/finance/FinanceContext";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all w-full text-left",
      active 
        ? "bg-brand-surface-light text-white border-l-2 border-brand-green" 
        : "text-slate-500 hover:text-slate-100 hover:bg-slate-800/30"
    )}
  >
    <Icon size={16} className={cn(active ? "text-brand-green" : "")} />
    {!collapsed && <span className="text-[13px] font-medium">{label}</span>}
  </button>
);

export type View = "dashboard" | "transacoes" | "importacao" | "relatorios" | "loja" | "casa" | "config" | "ia";

export default function Layout({ children, currentView, setView }: { children: React.ReactNode; currentView: View; setView: (v: View) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { state } = useFinance();

  const sistemasItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transacoes", label: "Lançamentos", icon: ListOrdered },
    { id: "loja", label: "Módulo Loja", icon: Store },
    { id: "casa", label: "Módulo Casa", icon: Home },
  ] as const;

  const analiseItems = [
    { id: "ia", label: "Diagnóstico IA", icon: Bot },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "importacao", label: "Importação", icon: FileInput },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg relative">
      {/* Sidebar Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 transform bg-brand-card border-r border-brand-border h-full transition-all duration-300 max-w-[280px] sm:max-w-[320px]",
        collapsed ? "w-16" : "w-[200px]",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-8 flex items-center justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-6 h-6 bg-brand-green rounded flex items-center justify-center">
                <span className="text-black font-extrabold text-sm font-mono">N</span>
              </div>
              {!collapsed && (
                <h1 className="text-sm font-bold tracking-[2px] text-brand-green font-mono uppercase">NEXUS_FINANCE</h1>
              )}
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 ml-2">Sistemas</p>
              <div className="space-y-1">
                {sistemasItems.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={currentView === item.id}
                    onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 ml-2">Análise</p>
              <div className="space-y-1">
                {analiseItems.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={currentView === item.id}
                    onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6">
               <NavItem
                icon={Settings}
                label="Configurações"
                active={currentView === 'config'}
                onClick={() => { setView('config'); setMobileMenuOpen(false); }}
                collapsed={collapsed}
              />
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-brand-border flex items-center justify-between px-6 shrink-0 bg-brand-bg/50 backdrop-blur-xl z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-white">
              {sistemasItems.find(m => m.id === currentView)?.label || analiseItems.find(m => m.id === currentView)?.label || currentView}
              <span className="text-slate-500 font-light ml-2">/ {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="status-badge hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
              LIVE: INTEGRATED_MODE
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
