import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || "3002");

const env = loadEnv("development", root, "");
for (const [key, value] of Object.entries(env)) {
  if (!(key in process.env)) {
    process.env[key] = value;
  }
}

const vite = await createViteServer({
  root,
  appType: "spa",
  server: {
    middlewareMode: true,
    host,
  },
});

const server = http.createServer(async (request, response) => {
  const url = request.url ?? "/";

  if (url.startsWith("/api/analyze-finance")) {
    try {
      const module = await vite.ssrLoadModule("/api/analyze-finance.ts");
      await module.default(request, response);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      const message = error instanceof Error ? error.message : "Falha interna do servidor local.";
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: message }));
    }
    return;
  }

  vite.middlewares(request, response, () => {
    response.statusCode = 404;
    response.end("Not found");
  });
});

const shutdown = async () => {
  await vite.close();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, host, () => {
  console.log(`Nexus Finance local server running at http://${host}:${port}`);
});
