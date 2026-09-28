"use client";

import { GoogleAccount } from "@/types/drive";

const REMOVED_ACCOUNTS_KEY = "levidrive_removed_accounts";
const CACHED_ACCOUNTS_LOCALSTORAGE_KEY = "levidrive_cached_accounts";

let cachedServerAccounts: GoogleAccount[] = [];
let cachedServerAccountsTime = 0;
let inflightServerAccountsPromise: Promise<GoogleAccount[]> | null = null;
const CLIENT_ACCOUNTS_TTL_MS = 60000; // 60 seconds client cache

export function getCachedLocalStorageAccounts(): GoogleAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHED_ACCOUNTS_LOCALSTORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [];
}

export function saveCachedLocalStorageAccounts(accounts: GoogleAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    if (accounts && accounts.length > 0) {
      localStorage.setItem(CACHED_ACCOUNTS_LOCALSTORAGE_KEY, JSON.stringify(accounts));
    } else {
      localStorage.removeItem(CACHED_ACCOUNTS_LOCALSTORAGE_KEY);
    }
  } catch (_) {}
}

const ALL_LOGGED_OUT_KEY = "levidrive_all_logged_out";

export function isAllLoggedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ALL_LOGGED_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

export function markAllAccountsLoggedOut(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALL_LOGGED_OUT_KEY, "true");
    localStorage.removeItem(CACHED_ACCOUNTS_LOCALSTORAGE_KEY);
    localStorage.removeItem("levidrive_has_google_account");
    cachedServerAccounts = [];
    cachedServerAccountsTime = 0;
    window.dispatchEvent(new Event("levidrive_accounts_changed"));
  } catch (_) {}
}

export function clearAllLoggedOutFlag(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ALL_LOGGED_OUT_KEY);
    localStorage.removeItem(REMOVED_ACCOUNTS_KEY);
  } catch (_) {}
}

export function hasCachedGoogleAccounts(): boolean {
  if (isAllLoggedOut()) return false;
  if (cachedServerAccounts.length > 0) return true;
  if (typeof window !== "undefined") {
    return getCachedLocalStorageAccounts().length > 0;
  }
  return false;
}

export function invalidateClientAccountsCache() {
  cachedServerAccounts = [];
  cachedServerAccountsTime = 0;
  saveCachedLocalStorageAccounts([]);
}

export async function fetchCachedServerAccounts(force = false): Promise<GoogleAccount[]> {
  if (isAllLoggedOut() && !force) {
    return [];
  }
  const now = Date.now();
  if (force) {
    cachedServerAccountsTime = 0;
  } else if (cachedServerAccounts.length > 0 && now - cachedServerAccountsTime < CLIENT_ACCOUNTS_TTL_MS) {
    return cachedServerAccounts;
  }

  // Pre-seed from localStorage if in-memory cache is empty
  if (!cachedServerAccounts || cachedServerAccounts.length === 0) {
    const fromLocal = getCachedLocalStorageAccounts();
    if (fromLocal.length > 0) {
      cachedServerAccounts = fromLocal;
      cachedServerAccountsTime = Date.now();
    }
  }

  if (inflightServerAccountsPromise && !force) {
    return inflightServerAccountsPromise;
  }
  inflightServerAccountsPromise = (async () => {
    try {
      const res = await fetch("/api/auth/accounts", { cache: "no-store" });
      if (res.ok) {
        const raw = await res.json();
        const data = raw as { accounts?: GoogleAccount[] } | null | undefined;
        const accountsList = data?.accounts;
        if (Array.isArray(accountsList)) {
          if (accountsList.length > 0) {
            clearAllLoggedOutFlag();
          }
          cachedServerAccounts = accountsList;
          cachedServerAccountsTime = Date.now();
          saveCachedLocalStorageAccounts(accountsList);
          return accountsList;
        }
      }
    } catch (_) {}
    return cachedServerAccounts;
  })().finally(() => {
    inflightServerAccountsPromise = null;
  });
  return inflightServerAccountsPromise;
}

export function getStoredRemovedAccountIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMOVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeAccount(
  account: Partial<GoogleAccount>,
  index?: number
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredRemovedAccountIds();
    const toAdd: string[] = [];
    if (account.id) toAdd.push(account.id);
    if (account.email && account.email.includes("@")) toAdd.push(account.email);
    if (account.name) toAdd.push(account.name);
    if (typeof index === "number") toAdd.push(`account-${index}`);

    for (const item of toAdd) {
      if (!current.includes(item)) {
        current.push(item);
      }
    }
    localStorage.setItem(REMOVED_ACCOUNTS_KEY, JSON.stringify(current));

    // Immediately remove from localStorage cache and in-memory cache
    const cached = getCachedLocalStorageAccounts();
    const updated = cached.filter((a, i) => {
      if (typeof index === "number" && i === index) return false;
      if (account.id && a.id === account.id) return false;
      if (account.email && account.email.includes("@") && a.email === account.email) return false;
      if (account.name && a.name === account.name) return false;
      return true;
    });
    saveCachedLocalStorageAccounts(updated);
    cachedServerAccounts = updated;
    cachedServerAccountsTime = Date.now();

    window.dispatchEvent(new Event("levidrive_accounts_changed"));
  } catch (err) {
    console.error("Failed to remove account:", err);
  }
}

export function removeAccountById(accountId: string) {
  removeAccount({ id: accountId });
}

export function restoreAllAccounts() {
  if (typeof window === "undefined") return;
  try {
    clearAllLoggedOutFlag();
    invalidateClientAccountsCache();
    localStorage.removeItem(REMOVED_ACCOUNTS_KEY);
    window.dispatchEvent(new Event("levidrive_accounts_changed"));
  } catch (err) {
    console.error("Failed to restore accounts:", err);
  }
}

export function filterAvailableAccounts(
  rawAccounts: GoogleAccount[]
): GoogleAccount[] {
  if (!rawAccounts || rawAccounts.length === 0) return [];
  return rawAccounts.filter((a) => {
    if (!a) return false;
    const email = typeof a.email === "string" ? a.email.trim() : "";
    const name = typeof a.name === "string" ? a.name.trim() : "";
    if (!email && !name) return false;
    if (
      email === "admin@levidrive.com" ||
      email === "levi.developer@gmail.com" ||
      email === "cloudvault.demo@gmail.com"
    ) {
      return false;
    }
    return true;
  });
}

export function getActiveAccounts(
  session: any,
  serverAccounts: GoogleAccount[] = []
): GoogleAccount[] {
  const hasServerAccs = Array.isArray(serverAccounts) && serverAccounts.length > 0;
  const hasSessionUser = Boolean(
    session?.user?.email ||
    session?.user?.name ||
    (Array.isArray(session?.accounts) && session.accounts.length > 0)
  );

  if (hasServerAccs || hasSessionUser) {
    clearAllLoggedOutFlag();
  } else if (isAllLoggedOut()) {
    return [];
  }

  let rawAccounts: GoogleAccount[] = [];

  // 1. Server accounts is the primary authoritative source for order (Account 0, Account 1, ...)
  if (Array.isArray(serverAccounts) && serverAccounts.length > 0) {
    rawAccounts = serverAccounts.filter(
      (a) =>
        a &&
        ((a.email && (a.email.includes("@") || a.email === "Akun Terverifikasi")) ||
          Boolean(a.name))
    );
  } else if (session?.accounts && session.accounts.length > 0) {
    rawAccounts = session.accounts.filter(
      (a: any) => a && ((a.email && a.email.includes("@")) || a.name)
    );
  } else if (session?.user && (session.user.email || session.user.name)) {
    rawAccounts = [
      {
        id: session.user.id || "primary",
        name: session.user.name || "Akun Google",
        email: session.user.email || "Akun Terverifikasi",
        image: session.user.image || undefined,
      },
    ];
  } else if (typeof window !== "undefined") {
    const fromStorage = getCachedLocalStorageAccounts();
    if (fromStorage && fromStorage.length > 0) {
      rawAccounts = [...fromStorage];
    }
  } else {
    rawAccounts = [];
  }

  // 2. If session has any account not yet in serverAccounts, append to the end (never changing index 0)
  if (session?.accounts && Array.isArray(session.accounts)) {
    for (const acc of session.accounts) {
      if (
        acc &&
        ((acc.email && acc.email.includes("@")) || acc.name) &&
        !rawAccounts.some((a) => (acc.email && a.email === acc.email) || (acc.id && a.id === acc.id))
      ) {
        rawAccounts.push(acc);
      }
    }
  }

  return filterAvailableAccounts(rawAccounts);
}

