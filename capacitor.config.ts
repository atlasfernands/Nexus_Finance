import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexusfinance.app",
  appName: "Nexus Finance",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
