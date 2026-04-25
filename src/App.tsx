/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from "react";
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { FinanceProvider, useFinance } from "./features/finance/FinanceContext";
import Layout, { View } from "./components/Layout";
import Auth from "./views/Auth";
import Dashboard from "./views/Dashboard";
import Transactions from "./views/Transactions";
import ImportTransactions from "./views/ImportTransactions";
import Reports from "./views/Reports";
import StoreModule from "./views/StoreModule";
import HomeModule from "./views/HomeModule";
import AIInsights from "./views/AIInsights";
import Settings from "./views/Settings";

function AppContent() {
  const { isConfigured, isReady, session } = useAuth();
  const { isReady: isFinanceReady } = useFinance();
  const [currentView, setView] = useState<View>("dashboard");

  const viewComponents = {
    dashboard: Dashboard,
    transactions: Transactions,
    import: ImportTransactions,
    reports: Reports,
    store: StoreModule,
    home: HomeModule,
    ai: AIInsights,
    settings: Settings,
  };

  const ViewComponent = viewComponents[currentView] || Dashboard;

  if (!isReady || !isFinanceReady) {
    return <div className="flex min-h-screen items-center justify-center text-brand-green">Carregando acesso...</div>;
  }

  if (!isConfigured || !session) {
    return <Auth />;
  }

  return (
    <Layout currentView={currentView} setView={setView}>
      <Suspense fallback={<div className="flex h-64 items-center justify-center text-brand-green animate-pulse">Carregando Nexus Engine...</div>}>
        <ViewComponent />
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
        <Analytics />
      </FinanceProvider>
    </AuthProvider>
  );
}

