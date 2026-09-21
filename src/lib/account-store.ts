"use client";

import { GoogleAccount } from "@/types/drive";

const REMOVED_ACCOUNTS_KEY = "levidrive_removed_accounts";

let cachedServerAccounts: GoogleAccount[] = [];
let cachedServerAccountsTime = 0;
let inflightServerAccountsPromise: Promise<GoogleAccount[]> | null = null;
const CLIENT_ACCOUNTS_TTL_MS = 10000; // 10 seconds client cache

export function invalidateClientAccountsCache() {
  cachedServerAccounts = [];
  cachedServerAccountsTime = 0;
}

export async function fetchCachedServerAccounts(force = false): Promise<GoogleAccount[]> {
  const now = Date.now();
  if (force) {
    invalidateClientAccountsCache();
  } else if (cachedServerAccounts.length > 0 && now - cachedServerAccountsTime < CLIENT_ACCOUNTS_TTL_MS) {
    return cachedServerAccounts;
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
  return rawAccounts.filter((a) => !removed.includes(a.id || a.email));
}

export function getActiveAccounts(
  session: any,
  serverAccounts: GoogleAccount[] = []
): GoogleAccount[] {
  let rawAccounts: GoogleAccount[] = [];

  // 1. Server accounts is the primary authoritative source for order (Account 0, Account 1, ...)
  if (Array.isArray(serverAccounts) && serverAccounts.length > 0) {
    rawAccounts = [...serverAccounts];
  } else if (session?.accounts && session.accounts.length > 0) {
    rawAccounts = [...session.accounts];
  } else if (session?.user) {
    rawAccounts = [
      {
        id: session.user.id || "primary",
        name: session.user.name || "Akun Google",
        email: session.user.email || "",
        image: session.user.image || undefined,
      },
    ];
  } else {
    rawAccounts = [];
  }

  // 2. If session has any account not yet in serverAccounts, append to the end (never changing index 0)
  if (session?.accounts && Array.isArray(session.accounts)) {
    for (const acc of session.accounts) {
      if (acc && !rawAccounts.some((a) => a.email === acc.email || a.id === acc.id)) {
        rawAccounts.push(acc);
      }
    }
  }

  // Filter out any removed accounts and any legacy demo/placeholder emails
  const filtered = filterAvailableAccounts(rawAccounts).filter(
    (a) =>
      a.email !== "admin@levidrive.com" &&
      a.email !== "levi.developer@gmail.com" &&
      a.email !== "cloudvault.demo@gmail.com"
  );

  return filtered;
}

