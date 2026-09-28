import { getSupabaseClient } from "./supabase";

export const SITE_SESSION_COOKIE_NAME = "levidrive_access_session";
export const DEFAULT_USER_PASSWORD = "drive-levi";
export const DEFAULT_ADMIN_PASSWORD = "admin-drive";

export type SiteRole = "admin" | "user";

export interface SiteSessionPayload {
  role: SiteRole;
  iat: number;
  exp: number;
}

const DEFAULT_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "levidrive-access-gate-jwt-secret-key-2026-very-secure";

// Helper to convert Uint8Array to hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to convert hex string to Uint8Array
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Base64URL helpers (Edge & Node compatible)
function base64UrlEncode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url");
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64url").toString("utf-8");
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

function base64UrlEncodeUint8Array(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecodeToUint8Array(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64url"));
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Hash password using Web Crypto PBKDF2-HMAC-SHA256 with salt
 */
export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return {
    hash: toHex(new Uint8Array(derivedBits)),
    salt: toHex(salt),
  };
}

/**
 * Verify password against target hash and salt
 */
export async function verifyPasswordWithHash(
  password: string,
  targetHash: string,
  saltHex: string
): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, saltHex);
    return hash.toLowerCase() === targetHash.toLowerCase();
  } catch (err) {
    console.error("[SiteAuth] Password verification error:", err);
    return false;
  }
}

export interface SitePasswordsConfig {
  adminPassword: string;
  userPassword: string;
  updatedAt?: number;
}

// In-memory cache for ultra-fast verification (5-second TTL for cross-instance real-time sync)
let memoryPasswordsConfig: SitePasswordsConfig | null = null;
let memoryPasswordsLoadedAt = 0;
const PASSWORDS_CACHE_TTL_MS = 5000;

function getKvConfig() {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

async function fetchPasswordsFromKv(): Promise<SitePasswordsConfig | null> {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/levidrive_gate_passwords`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.result) return null;
    const parsed =
      typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    if (parsed?.adminPassword && parsed?.userPassword) {
      return {
        adminPassword: String(parsed.adminPassword).trim(),
        userPassword: String(parsed.userPassword).trim(),
        updatedAt: Number(parsed.updatedAt) || Date.now(),
      };
    }
  } catch (_) {}
  return null;
}

async function savePasswordsToKv(config: SitePasswordsConfig): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  try {
    await fetch(`${kv.url}/set/levidrive_gate_passwords`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(config)),
    });
  } catch (_) {}
}

async function readLocalFilePasswords(): Promise<SitePasswordsConfig | null> {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const paths = [
      path.join(process.cwd(), ".site-passwords.json"),
      path.join(os.tmpdir(), ".site-passwords.json"),
    ];
    for (const p of paths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ p, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.adminPassword && parsed?.userPassword) {
          return {
            adminPassword: String(parsed.adminPassword).trim(),
            userPassword: String(parsed.userPassword).trim(),
            updatedAt: Number(parsed.updatedAt) || Date.now(),
          };
        }
      }
    }
  } catch (_) {}
  return null;
}

async function saveLocalFilePasswords(config: SitePasswordsConfig): Promise<void> {
  if (typeof process === "undefined" || !process.versions?.node) return;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const paths = [
      path.join(process.cwd(), ".site-passwords.json"),
      path.join(os.tmpdir(), ".site-passwords.json"),
    ];
    const data = JSON.stringify(config, null, 2);
    for (const p of paths) {
      try {
        fs.writeFileSync(/*turbopackIgnore: true*/ p, data, "utf-8");
      } catch (_) {}
    }
  } catch (_) {}
}

async function fetchPasswordsFromSupabase(): Promise<SitePasswordsConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("drive_sync_state")
      .select("start_page_token")
      .eq("account_id", "system_gate_passwords")
      .maybeSingle();

    if (!error && data?.start_page_token) {
      const parsed = JSON.parse(data.start_page_token);
      if (parsed?.adminPassword && parsed?.userPassword) {
        return {
          adminPassword: String(parsed.adminPassword).trim(),
          userPassword: String(parsed.userPassword).trim(),
          updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn("[SiteAuth] Error reading passwords from Supabase:", err);
  }
  return null;
}

async function savePasswordsToSupabase(config: SitePasswordsConfig): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from("drive_sync_state").upsert({
      account_id: "system_gate_passwords",
      start_page_token: JSON.stringify(config),
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[SiteAuth] Error saving passwords to Supabase:", err);
  }

  // Also update site_passwords table if it exists in Supabase
  try {
    const [adminHash, userHash] = await Promise.all([
      hashPassword(config.adminPassword),
      hashPassword(config.userPassword),
    ]);
    await supabase.from("site_passwords").upsert([
      {
        role: "admin",
        password_hash: adminHash.hash,
        salt: adminHash.salt,
        description: "Owner / Administrator Access",
        updated_at: new Date().toISOString(),
      },
      {
        role: "user",
        password_hash: userHash.hash,
        salt: userHash.salt,
        description: "Pengguna Biasa / Guest Access",
        updated_at: new Date().toISOString(),
      },
    ]);
  } catch (_) {
    // Non-fatal if site_passwords table doesn't exist
  }
}

/**
 * Get current gate passwords for Admin and Regular User with real-time caching
 */
export async function getSitePasswordsConfig(
  forceRefresh = false
): Promise<SitePasswordsConfig> {
  if (
    !forceRefresh &&
    memoryPasswordsConfig &&
    Date.now() - memoryPasswordsLoadedAt < PASSWORDS_CACHE_TTL_MS
  ) {
    return memoryPasswordsConfig;
  }

  // 1. Try Supabase
  let loaded = await fetchPasswordsFromSupabase();

  // 2. Try KV
  if (!loaded) {
    loaded = await fetchPasswordsFromKv();
  }

  // 3. Try local file
  if (!loaded) {
    loaded = await readLocalFilePasswords();
  }

  // 4. Default configuration fallback
  const defaultAdmin =
    process.env.SITE_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    DEFAULT_ADMIN_PASSWORD;
  const defaultUser =
    process.env.SITE_USER_PASSWORD ||
    process.env.USER_PASSWORD ||
    DEFAULT_USER_PASSWORD;

  const result: SitePasswordsConfig = {
    adminPassword: loaded?.adminPassword || defaultAdmin,
    userPassword: loaded?.userPassword || defaultUser,
    updatedAt: loaded?.updatedAt || Date.now(),
  };

  memoryPasswordsConfig = result;
  memoryPasswordsLoadedAt = Date.now();
  return result;
}

/**
 * Update gate passwords in real-time across Supabase, KV, local file, and memory
 */
export async function updateSitePasswordsConfig(
  newConfig: Partial<SitePasswordsConfig>
): Promise<SitePasswordsConfig> {
  const current = await getSitePasswordsConfig(true);
  const updatedAdmin =
    typeof newConfig.adminPassword === "string" && newConfig.adminPassword.trim()
      ? newConfig.adminPassword.trim()
      : current.adminPassword;

  const updatedUser =
    typeof newConfig.userPassword === "string" && newConfig.userPassword.trim()
      ? newConfig.userPassword.trim()
      : current.userPassword;

  const finalConfig: SitePasswordsConfig = {
    adminPassword: updatedAdmin,
    userPassword: updatedUser,
    updatedAt: Date.now(),
  };

  memoryPasswordsConfig = finalConfig;
  memoryPasswordsLoadedAt = Date.now();

  // Persist across all tiers asynchronously
  await Promise.allSettled([
    savePasswordsToSupabase(finalConfig),
    savePasswordsToKv(finalConfig),
    saveLocalFilePasswords(finalConfig),
  ]);

  return finalConfig;
}

/**
 * Verifies submitted password against dynamic real-time passwords and Supabase site_passwords table
 */
export async function verifySitePassword(
  password: string
): Promise<{ valid: boolean; role?: SiteRole }> {
  if (!password || typeof password !== "string") {
    return { valid: false };
  }

  const trimmedPassword = password.trim();
  const config = await getSitePasswordsConfig();

  // 1. Direct match with configured Admin Password
  if (trimmedPassword === config.adminPassword) {
    return { valid: true, role: "admin" };
  }

  // 2. Direct match with configured Regular User Password
  if (trimmedPassword === config.userPassword) {
    return { valid: true, role: "user" };
  }

  // 3. Fallback: check Supabase site_passwords table if someone set custom hashes
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("site_passwords")
        .select("role, password_hash, salt");

      if (!error && Array.isArray(data) && data.length > 0) {
        // Check admin role
        const adminRow = data.find((r) => r.role === "admin");
        if (adminRow?.password_hash && adminRow?.salt) {
          const isAdmin = await verifyPasswordWithHash(
            trimmedPassword,
            adminRow.password_hash,
            adminRow.salt
          );
          if (isAdmin) {
            return { valid: true, role: "admin" };
          }
        }

        // Check user role
        const userRow = data.find((r) => r.role === "user");
        if (userRow?.password_hash && userRow?.salt) {
          const isUser = await verifyPasswordWithHash(
            trimmedPassword,
            userRow.password_hash,
            userRow.salt
          );
          if (isUser) {
            return { valid: true, role: "user" };
          }
        }
      }
    } catch (err) {
      console.warn("[SiteAuth] Error querying Supabase site_passwords:", err);
    }
  }

  return { valid: false };
}

/**
 * Seed default passwords into Supabase site_passwords if table exists and is empty
 */
export async function seedSupabasePasswordsIfMissing() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { count, error } = await supabase
      .from("site_passwords")
      .select("*", { count: "exact", head: true });

    if (!error && (count === 0 || count === null)) {
      const [adminHash, userHash] = await Promise.all([
        hashPassword(DEFAULT_ADMIN_PASSWORD),
        hashPassword(DEFAULT_USER_PASSWORD),
      ]);

      await supabase.from("site_passwords").upsert([
        {
          role: "admin",
          password_hash: adminHash.hash,
          salt: adminHash.salt,
          description: "Owner / Administrator Access (admin-drive)",
          updated_at: new Date().toISOString(),
        },
        {
          role: "user",
          password_hash: userHash.hash,
          salt: userHash.salt,
          description: "Pengguna Biasa / Guest Access (drive-levi)",
          updated_at: new Date().toISOString(),
        },
      ]);
      console.log("[SiteAuth] Successfully seeded default passwords into Supabase!");
    }
  } catch (_) {
    // Non-fatal if table doesn't exist yet
  }
}

// Crypto key cache for signing & verification
let hmacKeyPromise: Promise<CryptoKey> | null = null;
function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    const enc = new TextEncoder();
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      enc.encode(DEFAULT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return hmacKeyPromise;
}

/**
 * Create a signed HMAC-SHA256 session token
 */
export async function createSiteToken(
  role: SiteRole,
  maxAgeSeconds = 30 * 24 * 60 * 60 // 30 days
): Promise<string> {
  const now = Date.now();
  const payload: SiteSessionPayload = {
    role,
    iat: now,
    exp: now + maxAgeSeconds * 1000,
  };

  const payloadStr = JSON.stringify(payload);
  const encPayload = base64UrlEncode(payloadStr);

  const key = await getHmacKey();
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(encPayload)
  );

  const encSignature = base64UrlEncodeUint8Array(new Uint8Array(signatureBuffer));
  return `${encPayload}.${encSignature}`;
}

/**
 * Verify a signed HMAC-SHA256 session token
 */
export async function verifySiteToken(
  token: string
): Promise<SiteSessionPayload | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [encPayload, encSignature] = token.split(".");
  if (!encPayload || !encSignature) {
    return null;
  }

  try {
    const key = await getHmacKey();
    const enc = new TextEncoder();
    const signatureBytes = base64UrlDecodeToUint8Array(encSignature);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as any,
      enc.encode(encPayload)
    );

    if (!isValid) {
      return null;
    }

    const payloadStr = base64UrlDecode(encPayload);
    const payload: SiteSessionPayload = JSON.parse(payloadStr);

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    if (payload.role !== "admin" && payload.role !== "user") {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Read site session from server cookies (for Server Components / Route Handlers)
 */
export async function getSiteSession(): Promise<SiteSessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(SITE_SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySiteToken(token);
  } catch (err) {
    return null;
  }
}
