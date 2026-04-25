/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
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
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../features/auth/AuthContext";
import { useFinance } from "../features/finance/FinanceContext";
import { useFinanceStats } from "../features/finance/useFinanceStats";
import { formatCurrency, parseDateString } from "../lib/utils";
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { state } = useFinance();
  const { logout, session, user } = useAuth();
  const { upcomingPendingExpenses } = useFinanceStats();

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Usuario";
  const displayEmail = user?.email ?? session?.user?.email ?? "";

  const notifications = upcomingPendingExpenses.map((transaction) => {
    const parsedDate = parseDateString(transaction.date);
    const dueDate = parsedDate ? new Date(parsedDate) : null;

    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
    }

    const daysUntil = dueDate
      ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const statusLabel =
      daysUntil === null
        ? "Data invalida"
        : daysUntil < 0
          ? `Venceu ha ${Math.abs(daysUntil)} dia(s)`
          : daysUntil === 0
            ? "Vence hoje"
            : `Faltam ${daysUntil} dia(s)`;

    const statusTone =
      daysUntil === null
        ? "text-slate-400"
        : daysUntil < 0
          ? "text-brand-red"
          : daysUntil <= 3
            ? "text-brand-yellow"
            : "text-brand-green";

    return {
      ...transaction,
      daysUntil,
      statusLabel,
      statusTone,
    };
  });

  const unreadCount = notifications.filter((notification) => notification.daysUntil === null || notification.daysUntil <= 7).length;

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-notification-root]")) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen]);

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
            <div className="relative" data-notification-root>
              <button
                type="button"
                aria-label="Abrir notificacoes"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-card text-slate-200 transition-all hover:border-brand-green/50 hover:text-white"
              >
                <Bell size={18} className={notifications.some((item) => item.daysUntil !== null && item.daysUntil <= 0) ? "text-brand-yellow" : undefined} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                    {Math.min(unreadCount, 9)}{unreadCount > 9 ? "+" : ""}
                  </span>
                )}
              </button>
            </div>
            <div className={cn("status-badge hidden items-center gap-2 sm:flex", statusInfo.color)}>
              <StatusIcon size={14} className={statusInfo.pulse ? "animate-pulse" : undefined} />
              {statusInfo.text}
            </div>
            <div className="hidden items-center gap-3 rounded-full border border-brand-border bg-brand-card px-3 py-1.5 text-xs text-slate-300 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/10 font-semibold text-brand-green">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="max-w-[140px]">
                <p className="truncate font-semibold text-white">{displayName}</p>
                <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">{displayEmail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              className="rounded-full border border-brand-border bg-brand-card px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-red/40 hover:text-white"
            >
              Sair
            </button>
          </div>
        </header>

        {notificationsOpen && (
          <div
            className="fixed right-4 top-[72px] z-40 w-[calc(100vw-2rem)] max-w-[390px] rounded-2xl border border-brand-border bg-brand-card/95 shadow-2xl backdrop-blur-xl sm:right-6"
            data-notification-root
          >
            <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-white">Notificacoes</h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Proximas contas e vencimentos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Fechar notificacoes"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-3">
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm text-slate-200">
                  Nenhuma conta pendente no periodo selecionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "rounded-xl border p-3 transition-colors",
                        notification.daysUntil !== null && notification.daysUntil < 0
                          ? "border-brand-red/30 bg-brand-red/5"
                          : notification.daysUntil !== null && notification.daysUntil <= 3
                            ? "border-brand-yellow/30 bg-brand-yellow/5"
                            : "border-brand-border bg-slate-900/80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{notification.description}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {notification.date} • {notification.subcategory} • {notification.category}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-xs font-bold text-white">
                          {formatCurrency(notification.amount)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className={cn("text-xs font-semibold", notification.statusTone)}>
                          {notification.statusLabel}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {notification.shortageAmount > 0
                            ? `Faltam ${formatCurrency(notification.shortageAmount)}`
                            : "Pagamento coberto"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
