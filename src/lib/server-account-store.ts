import fs from "fs";
import path from "path";
import os from "os";
import { getGoogleCredentials } from "@/lib/auth-credentials";
import {
  fetchStateFromSupabase,
  saveStateToSupabase,
  removeAccountFromSupabase,
} from "@/lib/supabase";

export interface ServerAccount {
  id: string;
  name: string;
  email: string;
  image?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // Epoch timestamp in seconds
  updatedAt?: number;
  isPrimaryEnv?: boolean;
}

export interface ServerStoreState {
  loggedOut: boolean;
  loggedOutAt: number; // Timestamp in milliseconds
  accounts: ServerAccount[];
}

// In-memory cache for warm lambda / serverless execution
let memoryState: ServerStoreState = {
  loggedOut: false,
  loggedOutAt: 0,
  accounts: [],
};
let memoryStateLoaded = false;

function getStorageFilePaths(): string[] {
  const list: string[] = [];
  try {
    list.push(path.join(process.cwd(), ".server-accounts.json"));
  } catch (_) {}
  try {
    list.push(path.join(os.tmpdir(), ".server-accounts.json"));
  } catch (_) {}
  return list;
}

/**
 * Check if external KV / Redis REST API is configured (e.g. Vercel KV or Upstash)
 */
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

/**
 * Fetch store state from KV / Redis REST API
 */
async function fetchStateFromKv(): Promise<ServerStoreState | null> {
  const kv = getKvConfig();
  if (!kv) return null;

  try {
    const res = await fetch(`${kv.url}/get/levidrive_server_store_state`, {
      headers: {
        Authorization: `Bearer ${kv.token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.result) return null;

    const parsed =
      typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed)) {
        return {
          loggedOut: false,
          loggedOutAt: 0,
          accounts: parsed,
        };
      }
      return {
        loggedOut: Boolean(parsed.loggedOut),
        loggedOutAt: Number(parsed.loggedOutAt) || 0,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    }
    return null;
  } catch (err) {
    console.warn("[ServerStore] KV fetch failed:", err);
    return null;
  }
}

/**
 * Save store state to KV / Redis REST API
 */
async function saveStateToKv(state: ServerStoreState): Promise<boolean> {
  const kv = getKvConfig();
  if (!kv) return false;

  try {
    const res = await fetch(`${kv.url}/set/levidrive_server_store_state`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(state)),
    });
    return res.ok;
  } catch (err) {
    console.warn("[ServerStore] KV save failed:", err);
    return false;
  }
}

/**
 * Read store state from local storage files
 */
function readStateFromLocalFiles(): ServerStoreState | null {
  for (const filePath of getStorageFilePaths()) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed)) {
            return {
              loggedOut: false,
              loggedOutAt: 0,
              accounts: parsed,
            };
          }
          return {
            loggedOut: Boolean(parsed.loggedOut),
            loggedOutAt: Number(parsed.loggedOutAt) || 0,
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          };
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Write store state to local storage files
 */
function writeStateToLocalFiles(state: ServerStoreState) {
  for (const filePath of getStorageFilePaths()) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
    } catch (_) {}
  }
}

/**
 * Write full state across memory, KV, and files
 */
async function persistStoreState(state: ServerStoreState): Promise<void> {
  memoryState = {
    loggedOut: Boolean(state.loggedOut),
    loggedOutAt: Number(state.loggedOutAt) || 0,
    accounts: Array.isArray(state.accounts) ? [...state.accounts] : [],
  };
  memoryStateLoaded = true;

  // 1. Persist to Supabase Cloud Database (primary)
  try {
    await saveStateToSupabase(memoryState);
  } catch (err) {
    console.warn("[ServerStore] Supabase save error:", err);
  }

  // 2. Persist to local storage files
  writeStateToLocalFiles(memoryState);

  // 3. Persist to KV if configured
  await saveStateToKv(memoryState);
}

/**
 * Fetch real user profile (name, email, photo) from Google Drive about API
 */
export async function fetchGoogleDriveUserProfile(
  accessToken: string
): Promise<{ displayName?: string; emailAddress?: string; photoLink?: string } | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data?.user || null;
    }
  } catch (err) {
    console.warn("[ServerStore] Failed to fetch Drive user profile:", err);
  }
  return null;
}

/**
 * Get account provisioned directly via Environment Variables
 * (e.g. GOOGLE_REFRESH_TOKEN or REFRESH_TOKEN set on Vercel/Netlify)
 */
export function getEnvProvisionedAccount(): ServerAccount | null {
  const refreshToken =
    process.env.GOOGLE_REFRESH_TOKEN ||
    process.env.REFRESH_TOKEN ||
    "";

  if (!refreshToken || refreshToken.includes("your-")) {
    return null;
  }

  const email = process.env.GOOGLE_ACCOUNT_EMAIL || "";
  const name = process.env.GOOGLE_ACCOUNT_NAME || "Akun Google";

  return {
    id: "env-primary-account",
    name,
    email,
    refreshToken,
    isPrimaryEnv: true,
  };
}

/**
 * Retrieve current store state (including loggedOut flag and timestamp)
 */
export async function getServerStoreState(): Promise<ServerStoreState> {
  // 1. Try Supabase cloud database first (global cross-device authority)
  try {
    const supabaseState = await fetchStateFromSupabase();
    if (supabaseState) {
      memoryState = supabaseState;
      memoryStateLoaded = true;
      return supabaseState;
    }
  } catch (err) {
    console.warn("[ServerStore] Supabase fetch error:", err);
  }

  // 2. Try external KV second
  const kvState = await fetchStateFromKv();
  if (kvState) {
    memoryState = kvState;
    memoryStateLoaded = true;
    return kvState;
  }

  // 3. Try in-memory if already loaded
  if (memoryStateLoaded) {
    return memoryState;
  }

  // 4. Try local files
  const fileState = readStateFromLocalFiles();
  if (fileState) {
    memoryState = fileState;
    memoryStateLoaded = true;
    return fileState;
  }

  // 4. Initial state (brand new setup, never logged in, never logged out):
  const envAcc = getEnvProvisionedAccount();
  const initialAccounts = envAcc ? [envAcc] : [];

  const initialState: ServerStoreState = {
    loggedOut: false,
    loggedOutAt: 0,
    accounts: initialAccounts,
  };

  await persistStoreState(initialState);
  return initialState;
}

/**
 * Retrieve all server-stored Google accounts
 */
export async function getServerAccounts(): Promise<ServerAccount[]> {
  const state = await getServerStoreState();
  if (state.loggedOut || !state.accounts || state.accounts.length === 0) {
    return [];
  }

  let accounts = [...state.accounts];
  // Clean out any legacy placeholder emails
  accounts = accounts.filter((a) => a.email !== "admin@levidrive.com");

  // Automatically resolve real Google profile from Google Drive API if needed
  let stateModified = false;
  for (const acc of accounts) {
    if ((!acc.email || acc.email === "admin@levidrive.com" || !acc.image) && acc.refreshToken) {
      try {
        const nowEpoch = Math.floor(Date.now() / 1000);
        let token = acc.accessToken;
        if (!token || !acc.expiresAt || acc.expiresAt < nowEpoch + 60) {
          const refreshed = await refreshGoogleAccessToken(acc.refreshToken);
          acc.accessToken = refreshed.accessToken;
          acc.expiresAt = nowEpoch + refreshed.expiresIn;
          token = refreshed.accessToken;
          stateModified = true;
        }

        if (token) {
          const profile = await fetchGoogleDriveUserProfile(token);
          if (profile) {
            if (profile.displayName) acc.name = profile.displayName;
            if (profile.emailAddress) acc.email = profile.emailAddress;
            if (profile.photoLink) acc.image = profile.photoLink;
            acc.updatedAt = Date.now();
            stateModified = true;
          }
        }
      } catch (_) {}
    }
  }

  if (stateModified) {
    state.accounts = accounts;
    await persistStoreState(state);
  }

  return accounts;
}

/**
 * Clear all accounts on explicit logout and mark loggedOut: true
 */
export async function clearAllServerAccounts(): Promise<void> {
  const state: ServerStoreState = {
    loggedOut: true,
    loggedOutAt: Date.now(),
    accounts: [],
  };
  await persistStoreState(state);
}

/**
 * Save or update an account in the server-side store
 */
export async function saveServerAccount(
  accountData: Partial<ServerAccount> & { id: string }
): Promise<ServerAccount> {
  const state = await getServerStoreState();
  // An active sign-in or save resets the loggedOut state
  state.loggedOut = false;
  state.loggedOutAt = 0;

  const accounts = [...state.accounts];
  const email = accountData.email || "";
  const existingIndex = accounts.findIndex(
    (a) => a.id === accountData.id || (email && a.email === email)
  );

  const updatedAccount: ServerAccount = {
    id: accountData.id,
    name: accountData.name || "Akun Google",
    email,
    image: accountData.image,
    accessToken: accountData.accessToken,
    refreshToken:
      accountData.refreshToken ||
      (existingIndex >= 0 ? accounts[existingIndex].refreshToken : undefined),
    expiresAt: accountData.expiresAt,
    updatedAt: Date.now(),
    isPrimaryEnv:
      existingIndex >= 0 ? accounts[existingIndex].isPrimaryEnv : false,
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = {
      ...accounts[existingIndex],
      ...updatedAccount,
    };
  } else {
    accounts.push(updatedAccount);
  }

  state.accounts = accounts;
  await persistStoreState(state);
  return updatedAccount;
}

/**
 * Remove an account from server-side store
 */
export async function removeServerAccount(accountId: string): Promise<boolean> {
  const state = await getServerStoreState();
  state.accounts = state.accounts.filter(
    (a) => a.id !== accountId && a.email !== accountId
  );

  if (state.accounts.length === 0) {
    state.loggedOut = true;
    state.loggedOutAt = Date.now();
  }

  try {
    await removeAccountFromSupabase(accountId);
  } catch (_) {}

  await persistStoreState(state);
  return true;
}

/**
 * Exchange Google OAuth Refresh Token for a fresh Access Token
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const creds = getGoogleCredentials();

  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(
      `Failed to refresh Google OAuth token (${resp.status}): ${errorBody}`
    );
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Get a guaranteed active, non-expired Access Token for an account index
 */
export async function getValidAccessTokenForAccount(
  accountIndex = 0
): Promise<string | null> {
  const accounts = await getServerAccounts();
  const account = accounts[accountIndex] || accounts[0];

  if (!account) {
    return null;
  }

  const nowEpoch = Math.floor(Date.now() / 1000);

  // If accessToken is still valid for at least 5 more minutes, use it
  if (
    account.accessToken &&
    account.expiresAt &&
    account.expiresAt > nowEpoch + 300
  ) {
    return account.accessToken;
  }

  // If we have a refreshToken, fetch a fresh access token from Google
  if (account.refreshToken) {
    try {
      const refreshed = await refreshGoogleAccessToken(account.refreshToken);
      account.accessToken = refreshed.accessToken;
      account.expiresAt = nowEpoch + refreshed.expiresIn;
      account.updatedAt = Date.now();

      // Update in server store
      await saveServerAccount(account);

      return account.accessToken;
    } catch (err) {
      console.error(
        `[ServerStore] Error refreshing token for account ${account.email}:`,
        err
      );
      // Return whatever we had if refresh failed
      return account.accessToken || null;
    }
  }

  return account.accessToken || null;
}
