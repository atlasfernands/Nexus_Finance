const androidVersion = "1.1.0";

export const mobileRelease = {
  android: {
    apkUrl: `/downloads/nexus-finance-${androidVersion}-debug.apk`,
    version: androidVersion,
    updatedAt: "2026-04-28",
  },
  pwaGuideUrl: "https://github.com/atlasfernands/Nexus_Finance/blob/main/docs/mobile/pwa-installation.md",
  releasesUrl: "https://github.com/atlasfernands/Nexus_Finance/releases",
} as const;

export const hasAndroidApkRelease = mobileRelease.android.apkUrl.trim().length > 0;
