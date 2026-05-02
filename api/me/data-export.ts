import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSupabaseUser, sendJson, sendMethodNotAllowed } from "../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, "GET");
    return;
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const [profileResult, transactionsResult, acceptancesResult, consentsResult, requestsResult] =
      await Promise.all([
        supabase.from("finance_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("finance_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: true }),
        supabase.from("user_legal_acceptances").select("*").eq("user_id", user.id),
        supabase.from("user_consents").select("*").eq("user_id", user.id),
        supabase.from("privacy_requests").select("*").eq("user_id", user.id),
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

    sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      message: "Arquivo de exportacao gerado. Guarde este arquivo em local seguro, pois ele pode conter informacoes pessoais e financeiras.",
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      },
      financeProfile: profileResult.data,
      financeTransactions: transactionsResult.data ?? [],
      legalAcceptances: acceptancesResult.data ?? [],
      consents: consentsResult.data ?? [],
      privacyRequests: requestsResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel exportar os dados.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
