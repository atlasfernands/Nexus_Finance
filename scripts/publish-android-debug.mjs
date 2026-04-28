import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  formatReleaseTimestamp,
  getAppVersion,
  getChecksumFileName,
  getDebugApkFileName,
  getDebugApkPath,
  getManualApkDir,
  getPublicDownloadsDir,
} from "./android-artifacts.mjs";

function createSha256File(filePath, targetDir, fileName) {
  const checksum = createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
  const checksumPath = path.join(targetDir, getChecksumFileName(fileName));
  writeFileSync(checksumPath, `${checksum}  ${fileName}\n`);
}

function removeManagedDownloadArtifacts(downloadsDir) {
  if (!existsSync(downloadsDir)) {
    return;
  }

  for (const fileName of readdirSync(downloadsDir)) {
    if (/^nexus-finance(?:-[\d.]+)?-debug(?:-[\d-]+)?\.(apk|sha256\.txt)$/i.test(fileName)) {
      rmSync(path.join(downloadsDir, fileName), { force: true });
    }
  }
}

const version = getAppVersion();
const sourceApkPath = getDebugApkPath(version);

if (!existsSync(sourceApkPath)) {
  console.error(`APK debug versionado nao encontrado em ${sourceApkPath}. Rode o build Android antes de publicar.`);
  process.exit(1);
}

const downloadsDir = getPublicDownloadsDir();
mkdirSync(downloadsDir, { recursive: true });
removeManagedDownloadArtifacts(downloadsDir);

const publicApkFileName = getDebugApkFileName(version);
const publicApkPath = path.join(downloadsDir, publicApkFileName);
copyFileSync(sourceApkPath, publicApkPath);
createSha256File(publicApkPath, downloadsDir, publicApkFileName);

const manualApkDir = getManualApkDir();
mkdirSync(manualApkDir, { recursive: true });

const timestamp = formatReleaseTimestamp();
const manualApkFileName = publicApkFileName.replace(/\.apk$/i, `-${timestamp}.apk`);
const manualApkPath = path.join(manualApkDir, manualApkFileName);
copyFileSync(sourceApkPath, manualApkPath);
createSha256File(manualApkPath, manualApkDir, manualApkFileName);

console.log(`APK publicado em ${publicApkPath}`);
console.log(`Copia manual criada em ${manualApkPath}`);
