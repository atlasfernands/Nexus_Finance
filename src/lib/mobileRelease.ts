export const mobileRelease = {
  android: {
    apkUrl: "",
    version: "",
    updatedAt: "",
  },
  pwaGuideUrl: "https://github.com/atlasfernands/Nexus_Finance/blob/main/docs/mobile/pwa-installation.md",
  releasesUrl: "https://github.com/atlasfernands/Nexus_Finance/releases",
} as const;

export const hasAndroidApkRelease = mobileRelease.android.apkUrl.trim().length > 0;
