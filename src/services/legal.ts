import { supabase } from "../lib/supabase";
import {
  BANK_STATEMENT_CONSENT_VERSION,
  LEGAL_DOCUMENT_VERSION,
  LegalDocumentType,
} from "../legal/legalDocuments";

export interface LegalAcceptance {
  id: string;
  user_id: string;
  document_type: LegalDocumentType;
  document_version: string;
  accepted_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: string;
  consent_version: string;
  accepted: boolean;
  accepted_at?: string | null;
  revoked_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  updated_at?: string | null;
}

export interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: PrivacyRequestType;
  status: string;
  description?: string | null;
  requested_at: string;
  completed_at?: string | null;
}

export type PrivacyRequestType =
  | "data_access"
  | "data_correction"
  | "data_export"
  | "bank_statement_deletion"
  | "account_deletion"
  | "consent_revocation";

export interface PrivacyStatus {
  acceptances: LegalAcceptance[];
  consents: UserConsent[];
  privacyRequests: PrivacyRequest[];
}

export const REQUIRED_LEGAL_DOCUMENTS: LegalDocumentType[] = [
  "terms_of_use",
  "privacy_policy",
  "user_guidelines",
];

const REQUEST_CREATED_MESSAGE =
  "Sua solicitacao foi registrada. Nossa equipe analisara o pedido e podera entrar em contato pelo e-mail cadastrado.";

class LegalApiUnavailableError extends Error {
  constructor() {
    super("Endpoint de privacidade indisponivel neste ambiente.");
    this.name = "LegalApiUnavailableError";
  }
}

function getUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent : null;
}

async function getCurrentSession() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token || !data.session.user) {
    throw new Error("Sessao obrigatoria.");
  }

  return data.session;
}

async function getAccessToken() {
  const session = await getCurrentSession();
  return session.access_token;
}

function isFallbackableLegalApiError(error: unknown) {
  if (error instanceof LegalApiUnavailableError || error instanceof TypeError) {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("endpoint de privacidade indisponivel") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

async function withDirectSupabaseFallback<T>(
  apiCall: () => Promise<T>,
  directCall: () => Promise<T>
) {
  try {
    return await apiCall();
  } catch (error) {
    if (!isFallbackableLegalApiError(error)) {
      throw error;
    }

    return directCall();
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new LegalApiUnavailableError();
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Falha ao comunicar com o servidor.";
    throw new Error(message);
  }

  return payload as T;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const token = accessToken ?? (await getAccessToken());
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  return parseApiResponse<T>(response);
}

function normalizePrivacyStatus(status: Partial<PrivacyStatus>): PrivacyStatus {
  return {
    acceptances: Array.isArray(status.acceptances) ? status.acceptances : [],
    consents: Array.isArray(status.consents) ? status.consents : [],
    privacyRequests: Array.isArray(status.privacyRequests) ? status.privacyRequests : [],
  };
}

async function fetchPrivacyStatusDirect(): Promise<PrivacyStatus> {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const userId = session.user.id;
  const [acceptancesResult, consentsResult, requestsResult] = await Promise.all([
    supabase
      .from("user_legal_acceptances")
      .select("*")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false }),
    supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("privacy_requests")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false }),
  ]);

  if (acceptancesResult.error) {
    throw acceptancesResult.error;
  }

  if (consentsResult.error) {
    throw consentsResult.error;
  }

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  return normalizePrivacyStatus({
    acceptances: acceptancesResult.data as LegalAcceptance[] | undefined,
    consents: consentsResult.data as UserConsent[] | undefined,
    privacyRequests: requestsResult.data as PrivacyRequest[] | undefined,
  });
}

async function acceptRequiredLegalDocumentsDirect() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const acceptedAt = new Date().toISOString();
  const rows = REQUIRED_LEGAL_DOCUMENTS.map((documentType) => ({
    user_id: session.user.id,
    document_type: documentType,
    document_version: LEGAL_DOCUMENT_VERSION,
    accepted_at: acceptedAt,
    ip_address: null,
    user_agent: getUserAgent(),
  }));

  const { data, error } = await supabase
    .from("user_legal_acceptances")
    .upsert(rows, { onConflict: "user_id,document_type,document_version" })
    .select("*");

  if (error) {
    throw error;
  }

  return { accepted: (data ?? rows) as LegalAcceptance[] };
}

async function acceptBankStatementConsentDirect(allowAggregatedImprovements: boolean) {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const acceptedAt = new Date().toISOString();
  const common = {
    user_id: session.user.id,
    consent_version: BANK_STATEMENT_CONSENT_VERSION,
    accepted: true,
    accepted_at: acceptedAt,
    revoked_at: null,
    ip_address: null,
    user_agent: getUserAgent(),
  };
  const rows = [
    {
      ...common,
      consent_type: "bank_statement_processing",
    },
  ];

  if (allowAggregatedImprovements) {
    rows.push({
      ...common,
      consent_type: "aggregated_anonymous_improvements",
    });
  }

  const { data, error } = await supabase
    .from("user_consents")
    .upsert(rows, { onConflict: "user_id,consent_type,consent_version" })
    .select("*");

  if (error) {
    throw error;
  }

  return { consents: (data ?? rows) as UserConsent[] };
}

async function revokeBankStatementConsentDirect() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("user_consents")
    .upsert(
      {
        user_id: session.user.id,
        consent_type: "bank_statement_processing",
        consent_version: BANK_STATEMENT_CONSENT_VERSION,
        accepted: false,
        accepted_at: null,
        revoked_at: now,
        ip_address: null,
        user_agent: getUserAgent(),
      },
      { onConflict: "user_id,consent_type,consent_version" }
    );

  if (error) {
    throw error;
  }

  return {
    message: "Consentimento revogado com sucesso. Novos uploads de extrato ficarao bloqueados ate nova autorizacao.",
  };
}

async function createPrivacyRequestDirect(requestType: PrivacyRequestType, description?: string) {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      user_id: session.user.id,
      request_type: requestType,
      status: "open",
      description: String(description ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    request: data as PrivacyRequest,
    message: REQUEST_CREATED_MESSAGE,
  };
}

async function exportMyDataDirect() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const session = await getCurrentSession();
  const userId = session.user.id;
  const [profileResult, transactionsResult, acceptancesResult, consentsResult, requestsResult] =
    await Promise.all([
      supabase.from("finance_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("finance_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: true }),
      supabase.from("user_legal_acceptances").select("*").eq("user_id", userId),
      supabase.from("user_consents").select("*").eq("user_id", userId),
      supabase.from("privacy_requests").select("*").eq("user_id", userId),
    ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (transactionsResult.error) {
    throw transactionsResult.error;
  }

  if (acceptancesResult.error) {
    throw acceptancesResult.error;
  }

  if (consentsResult.error) {
    throw consentsResult.error;
  }

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  return {
    generatedAt: new Date().toISOString(),
    message:
      "Arquivo de exportacao gerado. Guarde este arquivo em local seguro, pois ele pode conter informacoes pessoais e financeiras.",
    user: {
      id: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata,
    },
    financeProfile: profileResult.data,
    financeTransactions: transactionsResult.data ?? [],
    legalAcceptances: acceptancesResult.data ?? [],
    consents: consentsResult.data ?? [],
    privacyRequests: requestsResult.data ?? [],
  };
}

export async function acceptRequiredLegalDocuments(accessToken?: string) {
  return withDirectSupabaseFallback(
    () =>
      apiFetch<{ accepted: LegalAcceptance[] }>(
        "/api/legal/accept",
        {
          method: "POST",
          body: JSON.stringify({
            documents: REQUIRED_LEGAL_DOCUMENTS,
          }),
        },
        accessToken
      ),
    acceptRequiredLegalDocumentsDirect
  );
}

export async function fetchPrivacyStatus() {
  return withDirectSupabaseFallback(
    async () => normalizePrivacyStatus(await apiFetch<Partial<PrivacyStatus>>("/api/me/privacy")),
    fetchPrivacyStatusDirect
  );
}

export function hasActiveBankStatementConsent(status: PrivacyStatus | null) {
  return Boolean(
    status?.consents.some(
      (consent) =>
        consent.consent_type === "bank_statement_processing" &&
        consent.accepted &&
        !consent.revoked_at
    )
  );
}

export function hasRevokedBankStatementConsent(status: PrivacyStatus | null) {
  return Boolean(
    status?.consents.some(
      (consent) =>
        consent.consent_type === "bank_statement_processing" &&
        (!consent.accepted || Boolean(consent.revoked_at))
    )
  );
}

export async function acceptBankStatementConsent(allowAggregatedImprovements: boolean) {
  return withDirectSupabaseFallback(
    () =>
      apiFetch<{ consents: UserConsent[] }>("/api/me/consent/bank-statement", {
        method: "POST",
        body: JSON.stringify({ allowAggregatedImprovements }),
      }),
    () => acceptBankStatementConsentDirect(allowAggregatedImprovements)
  );
}

export async function revokeBankStatementConsent() {
  return withDirectSupabaseFallback(
    () =>
      apiFetch<{ message: string }>("/api/me/consent/revoke-bank-statement", {
        method: "POST",
      }),
    revokeBankStatementConsentDirect
  );
}

export async function createPrivacyRequest(requestType: PrivacyRequestType, description?: string) {
  return withDirectSupabaseFallback(
    () =>
      apiFetch<{ request: PrivacyRequest; message: string }>("/api/me/privacy-request", {
        method: "POST",
        body: JSON.stringify({ requestType, description }),
      }),
    () => createPrivacyRequestDirect(requestType, description)
  );
}

export async function exportMyData() {
  return withDirectSupabaseFallback(
    () => apiFetch<Record<string, unknown>>("/api/me/data-export"),
    exportMyDataDirect
  );
}
