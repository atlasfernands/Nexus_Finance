/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from "react";
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
import PrivacySettings from "./views/PrivacySettings";
import LegalDocumentPage from "./views/LegalDocumentPage";
import { getLegalDocumentByPath } from "./legal/legalDocuments";

function getInitialView(): View {
  if (typeof window !== "undefined" && window.location.pathname === "/configuracoes/privacidade") {
    return "privacy";
  }

  return "dashboard";
}

function AppContent() {
  const { isConfigured, isReady, session } = useAuth();
  const { isReady: isFinanceReady } = useFinance();
  const [currentView, setCurrentView] = useState<View>(getInitialView);

  const setView = (view: View) => {
    setCurrentView(view);

    if (typeof window === "undefined") {
      return;
    }

    if (view === "privacy") {
      window.history.pushState(null, "", "/configuracoes/privacidade");
      return;
    }

    if (window.location.pathname === "/configuracoes/privacidade") {
      window.history.pushState(null, "", "/");
    }
  };

  const viewComponents = {
    dashboard: Dashboard,
    transactions: Transactions,
    import: ImportTransactions,
    reports: Reports,
    store: StoreModule,
    home: HomeModule,
    ai: AIInsights,
    settings: Settings,
    privacy: PrivacySettings,
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
  const publicLegalDocument =
    typeof window !== "undefined" ? getLegalDocumentByPath(window.location.pathname) : null;

  if (publicLegalDocument) {
    return <LegalDocumentPage document={publicLegalDocument} />;
  }

  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
