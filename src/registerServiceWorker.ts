export function registerServiceWorker() {
  const env = (import.meta as any).env as { PROD?: boolean } | undefined;

  if (!env?.PROD || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("Falha ao registrar service worker do Nexus Finance", error);
    });
  });
}
