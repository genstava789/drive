import fs from "fs";
import path from "path";
import { getGoogleCredentials } from "./auth-credentials";

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

// In-memory cache for warm lambda / serverless execution
let memoryCache: ServerAccount[] = [];
let memoryCacheLoaded = false;

const LOCAL_STORAGE_FILE = path.join(process.cwd(), ".server-accounts.json");

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
 * Fetch accounts from KV / Redis REST API
 */
async function fetchFromKv(): Promise<ServerAccount[] | null> {
  const kv = getKvConfig();
  if (!kv) return null;

  try {
    const res = await fetch(`${kv.url}/get/levidrive_server_accounts`, {
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
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn("[ServerStore] KV fetch failed:", err);
    return null;
  }
}

/**
 * Save accounts to KV / Redis REST API
 */
async function saveToKv(accounts: ServerAccount[]): Promise<boolean> {
  const kv = getKvConfig();
  if (!kv) return false;

  try {
    const res = await fetch(`${kv.url}/set/levidrive_server_accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(accounts)),
    });
    return res.ok;
  } catch (err) {
    console.warn("[ServerStore] KV save failed:", err);
    return false;
  }
}

/**
 * Read accounts from local JSON file (development / Node environments)
 */
function readFromLocalFile(): ServerAccount[] {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[ServerStore] Local file read error:", err);
  }
  return [];
}

/**
 * Write accounts to local JSON file
 */
function writeToLocalFile(accounts: ServerAccount[]) {
  try {
    fs.writeFileSync(
      LOCAL_STORAGE_FILE,
      JSON.stringify(accounts, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("[ServerStore] Local file write error:", err);
  }
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

let userExplicitlyLoggedOut = false;

export function setExplicitLogout(loggedOut: boolean) {
  userExplicitlyLoggedOut = loggedOut;
}

export function isExplicitLoggedOut(): boolean {
  return userExplicitlyLoggedOut;
}

/**
 * Get account provisioned directly via Environment Variables
 * (e.g. GOOGLE_REFRESH_TOKEN or REFRESH_TOKEN set on Vercel/Netlify)
 */
export function getEnvProvisionedAccount(): ServerAccount | null {
  if (userExplicitlyLoggedOut) {
    return null;
  }

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
 * Retrieve all server-stored Google accounts
 */
export async function getServerAccounts(): Promise<ServerAccount[]> {
  if (userExplicitlyLoggedOut) {
    return [];
  }

  let accounts: ServerAccount[] = [];

  // 1. Try external KV / Redis first
  const kvAccounts = await fetchFromKv();
  if (kvAccounts && kvAccounts.length > 0) {
    accounts = kvAccounts;
  } else if (memoryCacheLoaded && memoryCache.length > 0) {
    // 2. Use in-memory cache
    accounts = memoryCache;
  } else {
    // 3. Fallback to local file
    accounts = readFromLocalFile();
  }

  // Clean out any legacy placeholder emails
  accounts = accounts.filter((a) => a.email !== "admin@levidrive.com");

  // 4. Merge with environment provisioned account if present
  const envAcc = getEnvProvisionedAccount();
  if (envAcc) {
    const existingIdx = accounts.findIndex(
      (a) => a.refreshToken === envAcc.refreshToken || a.isPrimaryEnv
    );
    if (existingIdx >= 0) {
      accounts[existingIdx] = {
        ...envAcc,
        ...accounts[existingIdx],
      };
    } else {
      accounts.unshift(envAcc);
    }
  }

  // 5. Automatically resolve real Google profile from Google Drive API
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
        }

        if (token) {
          const profile = await fetchGoogleDriveUserProfile(token);
          if (profile) {
            if (profile.displayName) acc.name = profile.displayName;
            if (profile.emailAddress) acc.email = profile.emailAddress;
            if (profile.photoLink) acc.image = profile.photoLink;
            acc.updatedAt = Date.now();
          }
        }
      } catch (_) {}
    }
  }

  memoryCache = accounts;
  memoryCacheLoaded = true;

  return accounts;
}

/**
 * Clear all accounts on explicit logout
 */
export async function clearAllServerAccounts(): Promise<void> {
  userExplicitlyLoggedOut = true;
  memoryCache = [];
  memoryCacheLoaded = true;
  await saveToKv([]);
  writeToLocalFile([]);
}

/**
 * Save or update an account in the server-side store
 */
export async function saveServerAccount(
  accountData: Partial<ServerAccount> & { id: string }
): Promise<ServerAccount> {
  userExplicitlyLoggedOut = false;
  const accounts = await getServerAccounts();

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

  memoryCache = [...accounts];
  memoryCacheLoaded = true;

  // Persist to KV if available
  await saveToKv(accounts);

  // Persist to local file in dev / node environments
  writeToLocalFile(accounts);

  return updatedAccount;
}

/**
 * Remove an account from server-side store
 */
export async function removeServerAccount(accountId: string): Promise<boolean> {
  let accounts = await getServerAccounts();
  accounts = accounts.filter(
    (a) => a.id !== accountId && a.email !== accountId
  );

  memoryCache = [...accounts];
  await saveToKv(accounts);
  writeToLocalFile(accounts);

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
