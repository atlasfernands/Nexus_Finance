import { createClient } from "@supabase/supabase-js";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  BANK_STATEMENT_CONSENT_VERSION,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_VERSION,
  LegalDocumentType,
  getLegalDocumentText,
} from "../legal/legalDocuments";

const MAX_BODY_BYTES = 16 * 1024;

export type PrivacyRequestType =
  | "data_access"
  | "data_correction"
  | "data_export"
  | "bank_statement_deletion"
  | "account_deletion"
  | "consent_revocation";

export const PRIVACY_REQUEST_TYPES: PrivacyRequestType[] = [
  "data_access",
  "data_correction",
  "data_export",
  "bank_statement_deletion",
  "account_deletion",
  "consent_revocation",
];

const REQUIRED_LEGAL_DOCUMENT_TYPES: LegalDocumentType[] = [
  "terms_of_use",
  "privacy_policy",
  "user_guidelines",
];

export function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

export function sendMethodNotAllowed(response: ServerResponse, method: string) {
  response.setHeader("Allow", method);
  sendJson(response, 405, { error: "Metodo nao permitido." });
}

export function getBearerToken(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function getRequestIp(request: IncomingMessage) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const rawValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return rawValue?.split(",")[0]?.trim() || null;
}

export function getUserAgent(request: IncomingMessage) {
  const userAgent = request.headers["user-agent"];
  return Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null;
}

export function readJsonBody<T = Record<string, unknown>>(request: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload muito grande."));
        request.destroy();
        return;
      }

      body += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve((body ? JSON.parse(body) : {}) as T);
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    request.on("error", reject);
  });
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase nao configurado no servidor.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createServerSupabase(accessToken?: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export async function requireSupabaseUser(request: IncomingMessage) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new Error("Sessao obrigatoria.");
  }

  const supabase = createServerSupabase(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Sessao invalida.");
  }

  return { accessToken, supabase, user: data.user };
}

export function normalizeDocumentTypes(value: unknown): LegalDocumentType[] {
  if (!Array.isArray(value)) {
    return REQUIRED_LEGAL_DOCUMENT_TYPES;
  }

  const allowed = new Set(Object.keys(LEGAL_DOCUMENTS));
  const documentTypes = value.filter((item): item is LegalDocumentType => {
    return typeof item === "string" && allowed.has(item);
  });

  return documentTypes.length > 0 ? documentTypes : REQUIRED_LEGAL_DOCUMENT_TYPES;
}

export async function fetchLegalDocument(documentType: LegalDocumentType) {
  const fallback = LEGAL_DOCUMENTS[documentType];

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("legal_documents")
      .select("type, version, title, content, is_active, published_at")
      .eq("type", documentType)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        ...fallback,
        content: getLegalDocumentText(fallback),
      };
    }

    return {
      type: data.type,
      version: data.version,
      title: data.title,
      publishedAt: data.published_at,
      content: data.content,
      fallbackSections: fallback.sections,
    };
  } catch {
    return {
      ...fallback,
      content: getLegalDocumentText(fallback),
    };
  }
}

export async function recordLegalAcceptances(
  request: IncomingMessage,
  documentTypes: LegalDocumentType[]
) {
  const { supabase, user } = await requireSupabaseUser(request);
  const acceptedAt = new Date().toISOString();
  const ipAddress = getRequestIp(request);
  const userAgent = getUserAgent(request);

  const rows = documentTypes.map((documentType) => ({
    user_id: user.id,
    document_type: documentType,
    document_version: LEGAL_DOCUMENT_VERSION,
    accepted_at: acceptedAt,
    ip_address: ipAddress,
    user_agent: userAgent,
  }));

  const { error } = await supabase
    .from("user_legal_acceptances")
    .upsert(rows, { onConflict: "user_id,document_type,document_version" });

  if (error) {
    throw error;
  }

  return rows;
}

export async function recordBankStatementConsent(
  request: IncomingMessage,
  allowAggregatedImprovements: boolean
) {
  const { supabase, user } = await requireSupabaseUser(request);
  const acceptedAt = new Date().toISOString();
  const common = {
    user_id: user.id,
    consent_version: BANK_STATEMENT_CONSENT_VERSION,
    accepted: true,
    accepted_at: acceptedAt,
    revoked_at: null,
    ip_address: getRequestIp(request),
    user_agent: getUserAgent(request),
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

  const { error } = await supabase
    .from("user_consents")
    .upsert(rows, { onConflict: "user_id,consent_type,consent_version" });

  if (error) {
    throw error;
  }

  return rows;
}

export async function revokeBankStatementConsent(request: IncomingMessage) {
  const { supabase, user } = await requireSupabaseUser(request);
  const now = new Date().toISOString();

  const { error } = await supabase.from("user_consents").upsert(
    {
      user_id: user.id,
      consent_type: "bank_statement_processing",
      consent_version: BANK_STATEMENT_CONSENT_VERSION,
      accepted: false,
      accepted_at: null,
      revoked_at: now,
      ip_address: getRequestIp(request),
      user_agent: getUserAgent(request),
    },
    { onConflict: "user_id,consent_type,consent_version" }
  );

  if (error) {
    throw error;
  }
}
