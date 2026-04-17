/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from "react";
import { FinanceProvider } from "./features/finance/FinanceContext";
import Layout, { View } from "./components/Layout";
import Dashboard from "./views/Dashboard";
import Transactions from "./views/Transactions";
import ImportTransactions from "./views/ImportTransactions";
import Reports from "./views/Reports";
import StoreModule from "./views/StoreModule";
import HomeModule from "./views/HomeModule";
import AIInsights from "./views/AIInsights";
import Settings from "./views/Settings";

function AppContent() {
  const [currentView, setView] = useState<View>("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <Dashboard />;
      case "transacoes": return <Transactions />;
      case "importacao": return <ImportTransactions />;
      case "relatorios": return <Reports />;
      case "loja": return <StoreModule />;
      case "casa": return <HomeModule />;
      case "ia": return <AIInsights />;
      case "config": return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setView}>
      <Suspense fallback={<div className="flex h-64 items-center justify-center text-brand-green animate-pulse">Carregando Nexus Engine...</div>}>
        {renderView()}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}

