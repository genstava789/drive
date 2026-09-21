"use client";

import { GoogleAccount } from "@/types/drive";
import { MOCK_ACCOUNTS } from "./mock-data";

const REMOVED_ACCOUNTS_KEY = "levidrive_removed_accounts";

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
  const isRealAuth = !!session?.user;
  let rawAccounts: GoogleAccount[] = [];

  if (isRealAuth && session?.accounts && session.accounts.length > 0) {
    rawAccounts = [...session.accounts];
  } else if (isRealAuth && session?.user) {
    rawAccounts = [
      {
        id: session.user.id || "primary",
        name: session.user.name || "Akun Google",
        email: session.user.email || "",
        image: session.user.image || undefined,
      },
    ];
  } else if (serverAccounts && serverAccounts.length > 0) {
    rawAccounts = [...serverAccounts];
  } else {
    rawAccounts = [...MOCK_ACCOUNTS];
  }

  // If serverAccounts has additional accounts not in current browser session, merge them
  if (serverAccounts && serverAccounts.length > 0 && rawAccounts !== MOCK_ACCOUNTS) {
    for (const sa of serverAccounts) {
      if (!rawAccounts.some((a) => a.email === sa.email || a.id === sa.id)) {
        rawAccounts.push(sa);
      }
    }
  }

  return filterAvailableAccounts(rawAccounts);
}

