import type { IncomingMessage, ServerResponse } from "node:http";
import {
  readJsonBody,
  recordBankStatementConsent,
  sendJson,
  sendMethodNotAllowed,
} from "../../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, "POST");
    return;
  }

  try {
    const payload = await readJsonBody<{ allowAggregatedImprovements?: boolean }>(request);
    const consents = await recordBankStatementConsent(request, Boolean(payload.allowAggregatedImprovements));
    sendJson(response, 200, { consents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel registrar o consentimento.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
