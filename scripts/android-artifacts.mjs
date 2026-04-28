import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const androidDebugOutputDir = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "debug");
const publicDownloadsDir = path.join(projectRoot, "public", "downloads");
const manualApkDir = "D:\\NexusFinance-APK";

export function getAppVersion() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return packageJson.version;
}

export function getDebugApkFileName(version = getAppVersion()) {
  return `nexus-finance-${version}-debug.apk`;
}

export function getDebugApkPath(version = getAppVersion()) {
  return path.join(androidDebugOutputDir, getDebugApkFileName(version));
}

export function getChecksumFileName(apkFileName) {
  return `${apkFileName.replace(/\.apk$/i, "")}.sha256.txt`;
}

export function getPublicDownloadsDir() {
  return publicDownloadsDir;
}

export function getManualApkDir() {
  return manualApkDir;
}

export function formatReleaseTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}`;
}
