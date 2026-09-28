import { getSupabaseClient } from "./supabase";
import { getSiteSession } from "./site-auth";

export interface WorkerConfig {
  defaultWorkerUrl: string;
  accountWorkers?: Record<string, string>; // e.g. { "0": "https://...", "1": "https://..." }
  useWorkerStreaming?: boolean;
  updatedAt?: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  defaultWorkerUrl:
    process.env.NEXT_PUBLIC_CF_WORKER_URL ||
    process.env.CF_WORKER_URL ||
    "",
  accountWorkers: {},
  useWorkerStreaming: process.env.NEXT_PUBLIC_USE_CF_STREAM === "true",
  updatedAt: 0,
};

let memoryWorkerConfig: WorkerConfig | null = null;
let memoryWorkerConfigLoadedAt = 0;
const WORKER_CONFIG_CACHE_TTL_MS = 15000; // 15 seconds in-memory cache

function getKvConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

/**
 * Fetch worker config from Supabase drive_sync_state table
 */
async function fetchWorkerConfigFromSupabase(): Promise<WorkerConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("drive_sync_state")
      .select("start_page_token")
      .eq("account_id", "system_worker_config")
      .maybeSingle();

    if (!error && data?.start_page_token) {
      const parsed = JSON.parse(data.start_page_token);
      if (parsed && typeof parsed.defaultWorkerUrl === "string") {
        return {
          defaultWorkerUrl: parsed.defaultWorkerUrl.trim(),
          accountWorkers: parsed.accountWorkers || {},
          useWorkerStreaming: Boolean(parsed.useWorkerStreaming),
          updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn("[WorkerConfig] Error reading config from Supabase:", err);
  }
  return null;
}

/**
 * Save worker config to Supabase drive_sync_state table
 */
async function saveWorkerConfigToSupabase(config: WorkerConfig): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("drive_sync_state").upsert(
      {
        account_id: "system_worker_config",
        start_page_token: JSON.stringify(config),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );
    if (error) {
      console.warn("[WorkerConfig] Error saving to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[WorkerConfig] Error saving to Supabase:", err);
    return false;
  }
}

/**
 * Fetch worker config from Vercel KV / Upstash Redis
 */
async function fetchWorkerConfigFromKv(): Promise<WorkerConfig | null> {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/levidrive_worker_config`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: any } | null;
    if (!json?.result) return null;
    const parsed =
      typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    if (parsed && typeof parsed.defaultWorkerUrl === "string") {
      return {
        defaultWorkerUrl: parsed.defaultWorkerUrl.trim(),
        accountWorkers: parsed.accountWorkers || {},
        useWorkerStreaming: Boolean(parsed.useWorkerStreaming),
        updatedAt: Number(parsed.updatedAt) || Date.now(),
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Save worker config to Vercel KV / Upstash Redis
 */
async function saveWorkerConfigToKv(config: WorkerConfig): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  try {
    await fetch(`${kv.url}/set/levidrive_worker_config`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(config)),
    });
  } catch (_) {}
}

/**
 * Local file fallback for development / server persistence
 */
async function readLocalFileWorkerConfig(): Promise<WorkerConfig | null> {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".worker-config.json");
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.defaultWorkerUrl === "string") {
        return {
          defaultWorkerUrl: parsed.defaultWorkerUrl.trim(),
          accountWorkers: parsed.accountWorkers || {},
          useWorkerStreaming: Boolean(parsed.useWorkerStreaming),
          updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
      }
    }
  } catch (_) {}
  return null;
}

async function saveLocalFileWorkerConfig(config: WorkerConfig): Promise<void> {
  if (typeof process === "undefined" || !process.versions?.node) return;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), ".worker-config.json");
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(config, null, 2), "utf-8");
  } catch (_) {}
}

/**
 * Retrieve current Worker Configuration (Supabase -> KV -> File -> Env)
 */
export async function getWorkerConfig(
  forceRefresh = false
): Promise<WorkerConfig> {
  if (
    !forceRefresh &&
    memoryWorkerConfig &&
    Date.now() - memoryWorkerConfigLoadedAt < WORKER_CONFIG_CACHE_TTL_MS
  ) {
    return memoryWorkerConfig;
  }

  // 1. Try Supabase
  let loaded = await fetchWorkerConfigFromSupabase();

  // 2. Try KV
  if (!loaded) {
    loaded = await fetchWorkerConfigFromKv();
  }

  // 3. Try Local File
  if (!loaded) {
    loaded = await readLocalFileWorkerConfig();
  }

  if (loaded) {
    memoryWorkerConfig = loaded;
    memoryWorkerConfigLoadedAt = Date.now();
    return loaded;
  }

  // 4. Fallback to env
  const fallback = {
    ...DEFAULT_CONFIG,
    defaultWorkerUrl:
      process.env.NEXT_PUBLIC_CF_WORKER_URL ||
      process.env.CF_WORKER_URL ||
      "",
    updatedAt: Date.now(),
  };
  memoryWorkerConfig = fallback;
  memoryWorkerConfigLoadedAt = Date.now();
  return fallback;
}

/**
 * Update and persist Worker Configuration
 */
export async function saveWorkerConfig(
  config: Partial<WorkerConfig>
): Promise<WorkerConfig> {
  const current = await getWorkerConfig(true);
  const updated: WorkerConfig = {
    defaultWorkerUrl:
      typeof config.defaultWorkerUrl === "string"
        ? config.defaultWorkerUrl.trim().replace(/\/+$/, "")
        : current.defaultWorkerUrl,
    accountWorkers:
      config.accountWorkers !== undefined
        ? config.accountWorkers
        : current.accountWorkers || {},
    useWorkerStreaming:
      config.useWorkerStreaming !== undefined
        ? Boolean(config.useWorkerStreaming)
        : current.useWorkerStreaming ?? false,
    updatedAt: Date.now(),
  };

  memoryWorkerConfig = updated;
  memoryWorkerConfigLoadedAt = Date.now();

  // Save concurrently across all persistent storage backends
  await Promise.allSettled([
    saveWorkerConfigToSupabase(updated),
    saveWorkerConfigToKv(updated),
    saveLocalFileWorkerConfig(updated),
  ]);

  return updated;
}
