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

export function getActiveAccounts(session: any): GoogleAccount[] {
  const isRealAuth = !!session?.user;
  const rawAccounts =
    isRealAuth && session?.accounts && session.accounts.length > 0
      ? session.accounts
      : isRealAuth && session?.user
      ? [
          {
            id: session.user.id || "primary",
            name: session.user.name || "Akun Google",
            email: session.user.email || "",
            image: session.user.image || undefined,
          },
        ]
      : MOCK_ACCOUNTS;

  return filterAvailableAccounts(rawAccounts);
}

