import type { IncomingMessage, ServerResponse } from "node:http";
import {
  normalizeDocumentTypes,
  readJsonBody,
  recordLegalAcceptances,
  sendJson,
  sendMethodNotAllowed,
} from "../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, "POST");
    return;
  }

  try {
    const payload = await readJsonBody<{ documents?: unknown }>(request);
    const accepted = await recordLegalAcceptances(request, normalizeDocumentTypes(payload.documents));
    sendJson(response, 200, { accepted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel registrar o aceite.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
