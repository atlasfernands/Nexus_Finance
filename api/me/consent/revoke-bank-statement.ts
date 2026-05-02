import type { IncomingMessage, ServerResponse } from "node:http";
import { revokeBankStatementConsent, sendJson, sendMethodNotAllowed } from "../../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, "POST");
    return;
  }

  try {
    await revokeBankStatementConsent(request);
    sendJson(response, 200, {
      message: "Consentimento revogado com sucesso. Novos uploads de extrato ficarao bloqueados ate nova autorizacao.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel revogar o consentimento.";
    const statusCode = message.includes("Sessao") ? 401 : 400;
    sendJson(response, statusCode, { error: message });
  }
}
