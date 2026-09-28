import { WorkerConfig } from "./worker-config";

const LOCALSTORAGE_KEY = "levidrive_worker_config";

let memoryConfig: WorkerConfig | null = null;

export function getStoredClientWorkerConfig(): WorkerConfig {
  if (memoryConfig) return memoryConfig;
  if (typeof window === "undefined") {
    return {
      defaultWorkerUrl: process.env.NEXT_PUBLIC_CF_WORKER_URL || "",
      accountWorkers: {},
      useWorkerStreaming: process.env.NEXT_PUBLIC_USE_CF_STREAM === "true",
      updatedAt: 0,
    };
  }

  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.defaultWorkerUrl === "string") {
        memoryConfig = parsed;
        return parsed;
      }
    }
  } catch (_) {}

  const fallback: WorkerConfig = {
    defaultWorkerUrl: process.env.NEXT_PUBLIC_CF_WORKER_URL || "",
    accountWorkers: {},
    useWorkerStreaming: process.env.NEXT_PUBLIC_USE_CF_STREAM === "true",
    updatedAt: 0,
  };
  memoryConfig = fallback;
  return fallback;
}

export function saveStoredClientWorkerConfig(config: WorkerConfig): void {
  memoryConfig = config;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("levidrive_worker_config_changed", { detail: config }));
  } catch (_) {}
}

/**
 * Get effective worker URL for a specific account index (0-based)
 */
export function getEffectiveWorkerUrl(accountIndex = 0): string {
  const cfg = getStoredClientWorkerConfig();
  const accKey = String(accountIndex);

  // 1. Account specific worker URL if configured and non-empty
  if (cfg.accountWorkers && cfg.accountWorkers[accKey]?.trim()) {
    return cfg.accountWorkers[accKey].trim().replace(/\/+$/, "");
  }

  // 2. Global / default worker URL
  if (cfg.defaultWorkerUrl?.trim()) {
    return cfg.defaultWorkerUrl.trim().replace(/\/+$/, "");
  }

  // 3. Fallback to build-time environment variable
  return (process.env.NEXT_PUBLIC_CF_WORKER_URL || "").replace(/\/+$/, "");
}

/**
 * Check if worker streaming is enabled
 */
export function isWorkerStreamingActive(): boolean {
  const cfg = getStoredClientWorkerConfig();
  if (typeof cfg.useWorkerStreaming === "boolean") {
    return cfg.useWorkerStreaming;
  }
  return process.env.NEXT_PUBLIC_USE_CF_STREAM === "true";
}

let syncPromise: Promise<WorkerConfig | null> | null = null;

/**
 * Fetch latest worker config from backend API and update client cache
 */
export async function syncClientWorkerConfig(): Promise<WorkerConfig | null> {
  if (typeof window === "undefined") return null;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const res = await fetch("/api/drive/worker-config", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { success: boolean; config: WorkerConfig } | null;
        if (json?.config) {
          saveStoredClientWorkerConfig(json.config);
          return json.config;
        }
      }
    } catch (_) {}
    return null;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}
