import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";
import { getAppVersion, getDebugApkPath } from "./android-artifacts.mjs";
import { createMobileEnv } from "./mobile-env.mjs";

const version = getAppVersion();
const apkPath = getDebugApkPath(version);

if (!existsSync(apkPath)) {
  console.error(`APK debug ${version} nao encontrado em ${apkPath}. Rode npm run android:apk:debug antes de instalar.`);
  process.exit(1);
}

const result = spawnSync("adb", ["install", "-r", apkPath], {
  env: createMobileEnv(),
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
