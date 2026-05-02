import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchLegalDocument, sendJson, sendMethodNotAllowed } from "../../src/server/legalApi";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, "GET");
    return;
  }

  const document = await fetchLegalDocument("privacy_policy");
  sendJson(response, 200, { document });
}
