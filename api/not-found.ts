import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 404;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end("Not Found");
}
