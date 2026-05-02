import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSupabaseUser, sendJson, sendMethodNotAllowed } from "../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, "GET");
    return;
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const [acceptancesResult, consentsResult, requestsResult] = await Promise.all([
      supabase
        .from("user_legal_acceptances")
        .select("*")
        .eq("user_id", user.id)
        .order("accepted_at", { ascending: false }),
      supabase
        .from("user_consents")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("privacy_requests")
        .select("*")
        .eq("user_id", user.id)
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

    sendJson(response, 200, {
      acceptances: acceptancesResult.data ?? [],
      consents: consentsResult.data ?? [],
      privacyRequests: requestsResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel carregar privacidade.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
