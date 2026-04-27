export const mobileRelease = {
  android: {
    apkUrl: "/downloads/nexus-finance-debug.apk",
    version: "0.1.0-debug",
    updatedAt: "2026-04-26",
  },
  pwaGuideUrl: "https://github.com/atlasfernands/Nexus_Finance/blob/main/docs/mobile/pwa-installation.md",
  releasesUrl: "https://github.com/atlasfernands/Nexus_Finance/releases",
} as const;

export const hasAndroidApkRelease = mobileRelease.android.apkUrl.trim().length > 0;
