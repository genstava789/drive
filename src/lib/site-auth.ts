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

/**
 * Verifies submitted password against Supabase `site_passwords` table
 * Falls back to default passwords ("drive-levi" -> "user", "admin-drive" -> "admin")
 */
export async function verifySitePassword(
  password: string
): Promise<{ valid: boolean; role?: SiteRole }> {
  if (!password || typeof password !== "string") {
    return { valid: false };
  }

  const trimmedPassword = password.trim();

  // 1. Try querying Supabase site_passwords table
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("site_passwords")
        .select("role, password_hash, salt");

      if (!error && Array.isArray(data) && data.length > 0) {
        // Check admin role first
        const adminRow = data.find((r) => r.role === "admin");
        if (adminRow && adminRow.password_hash && adminRow.salt) {
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
        if (userRow && userRow.password_hash && userRow.salt) {
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

  // 2. Fallback to default configured passwords
  if (trimmedPassword === DEFAULT_ADMIN_PASSWORD) {
    // Optionally seed/upsert into Supabase in the background
    seedSupabasePasswordsIfMissing().catch(() => {});
    return { valid: true, role: "admin" };
  }

  if (trimmedPassword === DEFAULT_USER_PASSWORD) {
    seedSupabasePasswordsIfMissing().catch(() => {});
    return { valid: true, role: "user" };
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
