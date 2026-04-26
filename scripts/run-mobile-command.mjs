import { spawnSync } from "node:child_process";
import process from "node:process";
import { createMobileEnv } from "./mobile-env.mjs";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Informe o comando mobile. Exemplo: node scripts/run-mobile-command.mjs cap sync android");
  process.exit(1);
}

const result = spawnSync(command, args, {
  env: createMobileEnv(),
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
