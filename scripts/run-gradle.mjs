import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createMobileEnv } from "./mobile-env.mjs";

const [task] = process.argv.slice(2);

if (!task) {
  console.error("Informe a task do Gradle. Exemplo: node scripts/run-gradle.mjs assembleDebug");
  process.exit(1);
}

const androidDir = join(process.cwd(), "android");
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradlePath = join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!existsSync(gradlePath)) {
  console.error("Projeto Android nao encontrado. Rode npx cap add android antes de gerar APK/AAB.");
  process.exit(1);
}

const result = spawnSync(gradleCommand, [task], {
  cwd: androidDir,
  env: createMobileEnv(),
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
