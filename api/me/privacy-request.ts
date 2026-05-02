import type { IncomingMessage, ServerResponse } from "node:http";
import {
  PRIVACY_REQUEST_TYPES,
  PrivacyRequestType,
  readJsonBody,
  requireSupabaseUser,
  sendJson,
  sendMethodNotAllowed,
} from "../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, "POST");
    return;
  }

  try {
    const payload = await readJsonBody<{ requestType?: string; description?: string }>(request);
    const requestType = payload.requestType as PrivacyRequestType;

    if (!PRIVACY_REQUEST_TYPES.includes(requestType)) {
      sendJson(response, 400, { error: "Tipo de solicitacao invalido." });
      return;
    }

    const { supabase, user } = await requireSupabaseUser(request);
    const { data, error } = await supabase
      .from("privacy_requests")
      .insert({
        user_id: user.id,
        request_type: requestType,
        status: "open",
        description: String(payload.description ?? "").trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    sendJson(response, 201, {
      request: data,
      message: "Sua solicitacao foi registrada. Nossa equipe analisara o pedido e podera entrar em contato pelo e-mail cadastrado.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel registrar a solicitacao.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
