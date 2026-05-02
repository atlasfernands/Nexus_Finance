import React, { useEffect, useState } from "react";
import { Download, FileText, RefreshCw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { LEGAL_CONTACT_EMAIL } from "../legal/legalDocuments";
import {
  PrivacyRequestType,
  PrivacyStatus,
  REQUIRED_LEGAL_DOCUMENTS,
  acceptRequiredLegalDocuments,
  createPrivacyRequest,
  exportMyData,
  fetchPrivacyStatus,
  hasActiveBankStatementConsent,
  revokeBankStatementConsent,
} from "../services/legal";

const REQUEST_ACTIONS: { type: PrivacyRequestType; label: string; description: string }[] = [
  {
    type: "data_access",
    label: "Solicitar meus dados",
    description: "Pedido de acesso aos dados pessoais e financeiros tratados na conta.",
  },
  {
    type: "data_correction",
    label: "Solicitar correcao",
    description: "Pedido de correcao de dados incompletos, inexatos ou desatualizados.",
  },
  {
    type: "bank_statement_deletion",
    label: "Solicitar exclusao dos meus extratos",
    description: "Pedido de exclusao dos extratos enviados e dados extraidos.",
  },
  {
    type: "account_deletion",
    label: "Solicitar exclusao da minha conta",
    description: "Pedido de exclusao da conta e dados associados, quando aplicavel.",
  },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "Nao registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDocumentLabel(documentType: string) {
  const labels: Record<string, string> = {
    terms_of_use: "Termos de Uso",
    privacy_policy: "Politica de Privacidade",
    cookie_policy: "Politica de Cookies",
    user_guidelines: "Diretrizes do Usuario",
  };

  return labels[documentType] ?? documentType;
}

function getConsentLabel(consentType: string) {
  const labels: Record<string, string> = {
    bank_statement_processing: "Processamento de extrato bancario",
    aggregated_anonymous_improvements: "Dados anonimizados e agregados para melhoria",
  };

  return labels[consentType] ?? consentType;
}

function downloadJsonFile(data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexus-finance-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PrivacySettings() {
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [legalAcceptanceChecked, setLegalAcceptanceChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPrivacyStatus = async () => {
    setLoading(true);
    setError("");

    try {
      setStatus(await fetchPrivacyStatus());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel carregar privacidade.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrivacyStatus();
  }, []);

  const handlePrivacyRequest = async (requestType: PrivacyRequestType, description: string) => {
    setActionLoading(requestType);
    setMessage("");
    setError("");

    try {
      const result = await createPrivacyRequest(requestType, description);
      setMessage(result.message);
      await loadPrivacyStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel registrar a solicitacao.");
    } finally {
      setActionLoading("");
    }
  };

  const handleRevokeConsent = async () => {
    setActionLoading("consent_revocation");
    setMessage("");
    setError("");

    try {
      const result = await revokeBankStatementConsent();
      setMessage(result.message);
      await loadPrivacyStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel revogar o consentimento.");
    } finally {
      setActionLoading("");
    }
  };

  const handleRequiredLegalAcceptance = async () => {
    if (!legalAcceptanceChecked) {
      setError("Marque a caixa para confirmar que leu e aceita os documentos legais.");
      return;
    }

    setActionLoading("legal_acceptance");
    setMessage("");
    setError("");

    try {
      await acceptRequiredLegalDocuments();
      setLegalAcceptanceChecked(false);
      setMessage("Aceite legal registrado com sucesso para esta conta.");
      await loadPrivacyStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel registrar o aceite legal.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDataExport = async () => {
    setActionLoading("data_export");
    setMessage("");
    setError("");

    try {
      const data = await exportMyData();
      downloadJsonFile(data);
      setMessage(
        "Arquivo de exportacao gerado. Guarde este arquivo em local seguro, pois ele pode conter informacoes pessoais e financeiras."
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel exportar os dados.");
    } finally {
      setActionLoading("");
    }
  };

  const activeBankConsent = hasActiveBankStatementConsent(status);
  const acceptedDocumentTypes = new Set(status?.acceptances.map((acceptance) => acceptance.document_type) ?? []);
  const missingRequiredDocuments = REQUIRED_LEGAL_DOCUMENTS.filter(
    (documentType) => !acceptedDocumentTypes.has(documentType)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-green">
                <ShieldCheck size={20} />
                <h3 className="text-xl font-bold text-white">Legal e Privacidade</h3>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Controle consentimentos, pedidos LGPD e exportacao dos seus dados.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void loadPrivacyStatus();
              }}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw size={16} /> Ver consentimentos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 rounded-2xl border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm text-brand-green">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-brand-red/30 bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
              {error}
            </div>
          )}

          {!loading && missingRequiredDocuments.length > 0 && (
            <div className="mb-4 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4">
              <p className="text-sm font-bold text-white">Aceite legal pendente nesta conta</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Para vincular este e-mail aos documentos legais atuais, confirme o aceite de{" "}
                {missingRequiredDocuments.map(getDocumentLabel).join(", ")}.
              </p>
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-brand-border bg-slate-950/60 p-3 text-sm leading-6 text-slate-300">
                <input
                  type="checkbox"
                  checked={legalAcceptanceChecked}
                  onChange={(event) => setLegalAcceptanceChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-border bg-slate-950 accent-brand-green"
                />
                <span>
                  Li e aceito os Termos de Uso, a Politica de Privacidade e as Diretrizes do Usuario do Nexus Finance.
                </span>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void handleRequiredLegalAcceptance();
                }}
                disabled={Boolean(actionLoading) || !legalAcceptanceChecked}
                className="mt-4 gap-2"
              >
                <ShieldCheck size={16} />
                {actionLoading === "legal_acceptance" ? "Registrando aceite..." : "Registrar aceite legal"}
              </Button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-brand-border bg-slate-950/50 p-5">
              <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Meus consentimentos</h4>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Carregando registros...</p>
                ) : (
                  <>
                    {status?.acceptances.length ? (
                      status.acceptances.map((acceptance) => (
                        <div key={acceptance.id} className="rounded-xl border border-brand-border bg-slate-900/60 p-3">
                          <p className="text-sm font-semibold text-white">{getDocumentLabel(acceptance.document_type)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Versao {acceptance.document_version} aceita em {formatDate(acceptance.accepted_at)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-brand-green">Status: ativo</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-brand-border bg-slate-900/60 p-3 text-sm text-slate-400">
                        Nenhum aceite legal registrado nesta conta ainda.
                      </div>
                    )}

                    <div className="rounded-xl border border-brand-border bg-slate-900/60 p-3">
                      <p className="text-sm font-semibold text-white">Consentimento de processamento de extrato bancario</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Status: {activeBankConsent ? "ativo" : "revogado ou pendente de autorizacao"}
                      </p>
                    </div>

                    {status?.consents.map((consent) => (
                      <div key={consent.id} className="rounded-xl border border-brand-border bg-slate-900/60 p-3">
                        <p className="text-sm font-semibold text-white">{getConsentLabel(consent.consent_type)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Versao {consent.consent_version} aceita em {formatDate(consent.accepted_at)}
                        </p>
                        <p className={consent.accepted && !consent.revoked_at ? "mt-1 text-xs font-semibold text-brand-green" : "mt-1 text-xs font-semibold text-brand-yellow"}>
                          Status: {consent.accepted && !consent.revoked_at ? "ativo" : `revogado em ${formatDate(consent.revoked_at)}`}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-brand-border bg-slate-950/50 p-5">
              <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Direitos sobre meus dados</h4>
              <div className="mt-4 grid gap-2">
                {REQUEST_ACTIONS.map((action) => (
                  <Button
                    key={action.type}
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void handlePrivacyRequest(action.type, action.description);
                    }}
                    disabled={Boolean(actionLoading)}
                    className="justify-start gap-2"
                  >
                    <FileText size={16} /> {actionLoading === action.type ? "Registrando..." : action.label}
                  </Button>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handleDataExport();
                  }}
                  disabled={Boolean(actionLoading)}
                  className="justify-start gap-2"
                >
                  <Download size={16} /> {actionLoading === "data_export" ? "Gerando..." : "Exportar dados"}
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    void handleRevokeConsent();
                  }}
                  disabled={Boolean(actionLoading)}
                  className="justify-start gap-2"
                >
                  <XCircle size={16} /> {actionLoading === "consent_revocation" ? "Revogando..." : "Revogar consentimento"}
                </Button>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 p-3 text-brand-yellow">
              <Trash2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Aviso sobre extratos bancarios</h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Extratos bancarios podem conter informacoes financeiras pessoais. Voce pode solicitar a exclusao dos
                extratos enviados e dos dados extraidos, observadas eventuais retencoes necessarias para seguranca,
                prevencao de fraude, cumprimento legal ou defesa de direitos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Canal de privacidade</h4>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Para duvidas, revisoes manuais ou pedidos fora da plataforma, entre em contato pelo e-mail{" "}
            <span className="font-semibold text-brand-green">{LEGAL_CONTACT_EMAIL}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
