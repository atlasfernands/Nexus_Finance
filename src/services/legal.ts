import { supabase } from "../lib/supabase";
import { LegalDocumentType } from "../legal/legalDocuments";

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

async function getAccessToken() {
  if (!supabase) {
    throw new Error("Supabase ainda nao foi configurado neste projeto.");
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Sessao obrigatoria.");
  }

  return data.session.access_token;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("Endpoint de privacidade indisponivel neste ambiente.");
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

export async function acceptRequiredLegalDocuments(accessToken?: string) {
  return apiFetch<{ accepted: LegalAcceptance[] }>(
    "/api/legal/accept",
    {
      method: "POST",
      body: JSON.stringify({
        documents: ["terms_of_use", "privacy_policy"],
      }),
    },
    accessToken
  );
}

export async function fetchPrivacyStatus() {
  const status = await apiFetch<Partial<PrivacyStatus>>("/api/me/privacy");

  return {
    acceptances: Array.isArray(status.acceptances) ? status.acceptances : [],
    consents: Array.isArray(status.consents) ? status.consents : [],
    privacyRequests: Array.isArray(status.privacyRequests) ? status.privacyRequests : [],
  };
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
  return apiFetch<{ consents: UserConsent[] }>("/api/me/consent/bank-statement", {
    method: "POST",
    body: JSON.stringify({ allowAggregatedImprovements }),
  });
}

export async function revokeBankStatementConsent() {
  return apiFetch<{ message: string }>("/api/me/consent/revoke-bank-statement", {
    method: "POST",
  });
}

export async function createPrivacyRequest(requestType: PrivacyRequestType, description?: string) {
  return apiFetch<{ request: PrivacyRequest; message: string }>("/api/me/privacy-request", {
    method: "POST",
    body: JSON.stringify({ requestType, description }),
  });
}

export async function exportMyData() {
  return apiFetch<Record<string, unknown>>("/api/me/data-export");
}
