import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const mobileDownloadsDir = path.join(process.cwd(), "dist", "downloads");

if (existsSync(mobileDownloadsDir)) {
  rmSync(mobileDownloadsDir, { recursive: true, force: true });
  console.log("Removed dist/downloads before Capacitor sync to avoid packaging APK downloads inside the Android app.");
}
