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

export function hasCachedGoogleAccounts(): boolean {
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
  const now = Date.now();
  if (force) {
    // Invalidate in-memory timestamp so fresh accounts are fetched from server,
    // but KEEP existing cached accounts in place to prevent UI flicker!
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
        const data = await res.json();
        if (Array.isArray(data?.accounts)) {
          cachedServerAccounts = data.accounts;
          cachedServerAccountsTime = Date.now();
          saveCachedLocalStorageAccounts(data.accounts);
          return data.accounts;
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

export function removeAccountById(accountId: string) {
  if (typeof window === "undefined") return;
  try {
    invalidateClientAccountsCache();
    const current = getStoredRemovedAccountIds();
    if (!current.includes(accountId)) {
      current.push(accountId);
      localStorage.setItem(REMOVED_ACCOUNTS_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event("levidrive_accounts_changed"));
    }
  } catch (err) {
    console.error("Failed to remove account:", err);
  }
}

export function restoreAllAccounts() {
  if (typeof window === "undefined") return;
  try {
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
  const removed = getStoredRemovedAccountIds();
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
    const id = a.id || email || name;
    if (removed.includes(id) || (email && removed.includes(email))) {
      return false;
    }
    return true;
  });
}

export function getActiveAccounts(
  session: any,
  serverAccounts: GoogleAccount[] = []
): GoogleAccount[] {
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

