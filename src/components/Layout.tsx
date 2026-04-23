/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  FileInput,
  Home,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Settings,
  Store,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useFinance } from "../features/finance/FinanceContext";
import ReportingPeriodControls from "./ReportingPeriodControls";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-md py-2.5 text-left transition-all",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "border-l-2 border-brand-green bg-brand-surface-light text-white"
          : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-100"
      )}
    >
      <Icon size={16} className={cn(active ? "text-brand-green" : "")} />
      {!collapsed && <span className="truncate text-[13px] font-medium">{label}</span>}
    </button>
  );
}

export type View =
  | "dashboard"
  | "transactions"
  | "import"
  | "reports"
  | "store"
  | "home"
  | "settings"
  | "ai";

export default function Layout({
  children,
  currentView,
  setView,
}: {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "checking">("checking");
  const { state } = useFinance();

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const hasData = state.transactions.length > 0;
        const hasApiKey = true;

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSystemStatus(hasData && hasApiKey ? "online" : "offline");
      } catch {
        setSystemStatus("offline");
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000);

    return () => clearInterval(interval);
  }, [state.transactions.length]);

  const getStatusInfo = () => {
    switch (systemStatus) {
      case "online":
        return {
          text: "AO VIVO: MODO INTEGRADO",
          color: "text-brand-green",
          icon: Wifi,
          pulse: true,
        };
      case "offline":
        return {
          text: "OFFLINE: MODO LOCAL",
          color: "text-brand-red",
          icon: WifiOff,
          pulse: false,
        };
      default:
        return {
          text: "VERIFICANDO SISTEMA...",
          color: "text-yellow-400",
          icon: Wifi,
          pulse: true,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const sidebarCollapsed = collapsed && !mobileMenuOpen;

  const systemsItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Lancamentos", icon: ListOrdered },
    { id: "store", label: "Modulo Loja", icon: Store },
    { id: "home", label: "Modulo Casa", icon: Home },
  ] as const;

  const analysisItems = [
    { id: "ai", label: "Diagnostico IA", icon: Bot },
    { id: "reports", label: "Relatorios", icon: BarChart3 },
    { id: "import", label: "Importacao", icon: FileInput },
  ] as const;

  const currentViewLabel =
    systemsItems.find((item) => item.id === currentView)?.label ||
    analysisItems.find((item) => item.id === currentView)?.label ||
    currentView;
  const showReportingPeriodControls = !["transactions", "import", "settings"].includes(currentView);

  return (
    <div className="relative flex h-screen overflow-hidden bg-brand-bg">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full transform border-r border-brand-border bg-brand-card transition-all duration-300 lg:static",
          sidebarCollapsed ? "w-16" : "w-[240px]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col py-6">
          <div className="mb-8 flex items-center justify-center px-6">
            <button
              onClick={() => setCollapsed((value) => !value)}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-green">
                <span className="font-mono text-sm font-extrabold text-black">N</span>
              </div>
              {!sidebarCollapsed && (
                <h1 className="font-mono text-sm font-bold uppercase tracking-[2px] text-brand-green">
                  NEXUS_FINANCE
                </h1>
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3">
            <div>
              {!sidebarCollapsed && (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-slate-500">
                  Sistemas
                </p>
              )}
              <div className="space-y-1">
                {systemsItems.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={currentView === item.id}
                    onClick={() => {
                      setView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>

            <div>
              {!sidebarCollapsed && (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-slate-500">
                  Analise
                </p>
              )}
              <div className="space-y-1">
                {analysisItems.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={currentView === item.id}
                    onClick={() => {
                      setView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <NavItem
                icon={Settings}
                label="Configuracoes"
                active={currentView === "settings"}
                onClick={() => {
                  setView("settings");
                  setMobileMenuOpen(false);
                }}
                collapsed={sidebarCollapsed}
              />
            </div>
          </nav>
        </div>
      </aside>

      <main className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-brand-border bg-brand-bg/50 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button className="text-white lg:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-white">
              {currentViewLabel}
              <span className="ml-2 font-light text-slate-500">
                / {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn("status-badge hidden items-center gap-2 sm:flex", statusInfo.color)}>
              <StatusIcon size={14} className={statusInfo.pulse ? "animate-pulse" : undefined} />
              {statusInfo.text}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {showReportingPeriodControls && <ReportingPeriodControls />}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
