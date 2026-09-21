"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  HelpCircle,
  Plus,
  Check,
  ChevronDown,
} from "lucide-react";
import { OAuthSetupDialog } from "./oauth-setup-dialog";
import {
  removeAccountById,
  getActiveAccounts,
} from "@/lib/account-store";
import { GoogleAccount } from "@/types/drive";

interface UserNavProps {
  accountIndex?: number;
}

export function UserNav({ accountIndex = 0 }: UserNavProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [serverAccounts, setServerAccounts] = useState<GoogleAccount[]>([]);

  // Fetch accounts from server-side store (multi-device & serverless persistent accounts)
  useEffect(() => {
    fetch("/api/auth/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data?.accounts && Array.isArray(data.accounts)) {
          setServerAccounts(data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  // Collect and filter available accounts
  useEffect(() => {
    const updateAccounts = () => {
      setAccounts(getActiveAccounts(session, serverAccounts));
    };

    updateAccounts();

    window.addEventListener("levidrive_accounts_changed", updateAccounts);
    return () => {
      window.removeEventListener("levidrive_accounts_changed", updateAccounts);
    };
  }, [session, serverAccounts]);

  const activeAccount = accounts[accountIndex] || accounts[0];

  const handleSwitchAccount = (targetIndex: number) => {
    router.push(`/${targetIndex}`);
  };

  const handleAddAccount = () => {
    signIn("google", {
      prompt: "select_account",
      callbackUrl: `/${accounts.length}`,
    });
  };

  const handleLogoutSingleAccount = async (
    e: React.MouseEvent,
    account: GoogleAccount,
    idx: number
  ) => {
    e.stopPropagation();
    removeAccountById(account.id || account.email);

    // Also remove from server-side store so other devices reflect the logout
    try {
      await fetch(
        `/api/auth/accounts?id=${encodeURIComponent(account.id || account.email)}`,
        { method: "DELETE" }
      );
      if (accounts.length <= 1) {
        await fetch("/api/auth/accounts?all=true", { method: "DELETE" });
      }
      setServerAccounts((prev) =>
        prev.filter((a) => a.id !== account.id && a.email !== account.email)
      );
    } catch (_) {}

    if (accounts.length <= 1) {
      signOut({ redirect: false });
      setAccounts([]);
      setServerAccounts([]);
      window.dispatchEvent(new Event("levidrive_accounts_changed"));
    }

    const nextIdx = idx === accountIndex ? 0 : accountIndex > idx ? accountIndex - 1 : accountIndex;
    router.push(`/${nextIdx}`);
  };

  const handleLogoutAllAccounts = async () => {
    try {
      await fetch("/api/auth/accounts?all=true", { method: "DELETE" });
    } catch (_) {}
    signOut({ redirect: false });
    setAccounts([]);
    setServerAccounts([]);
    window.dispatchEvent(new Event("levidrive_accounts_changed"));
    router.push("/0");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Setup guide trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGuideOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600 border-slate-200 bg-white/90 hover:bg-slate-50 h-8 px-2.5 rounded-lg shadow-2xs"
        >
          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          <span>Setup OAuth</span>
        </Button>

        {status === "loading" ? (
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
        ) : accounts.length === 0 ? (
          /* No active accounts logged in */
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleAddAccount}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.54 0 2.92.54 4.01 1.43l3.01-3.01C17.19 1.77 14.77 1 12 1 7.42 1 3.53 3.61 1.64 7.39l3.66 2.84C6.18 7.35 8.84 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.86c2.14-1.98 3.74-4.89 3.74-8.68z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.77c-.23-.68-.36-1.41-.36-2.17s.13-1.49.36-2.17L1.64 7.59C.6 9.68 0 12 0 14.4s.6 4.72 1.64 6.81l3.66-2.84z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.68-2.86c-1.07.72-2.45 1.16-4.25 1.16-3.16 0-5.82-2.35-6.7-5.23L1.64 16c1.89 3.78 5.78 6.4 10.36 6.4z"
                />
              </svg>
              <span>Login Google</span>
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full p-1 pl-1.5 pr-2.5 border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition outline-none cursor-pointer">
                {activeAccount?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeAccount.image}
                    alt={activeAccount.name}
                    className="h-6 w-6 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {activeAccount?.name?.charAt(0) || "L"}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline-block">
                  {activeAccount?.name}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1 rounded">
                  /{accountIndex}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-68 p-1.5 shadow-lg">
              <DropdownMenuLabel className="px-2 py-1">
                <p className="text-xs font-bold text-slate-800">Daftar Akun Google</p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Pilih akun untuk beralih atau logout per akun
                </p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Account list with individual logout button */}
              <div className="space-y-1 py-1">
                {accounts.map((acc, idx) => {
                  const isActive = idx === accountIndex;
                  return (
                    <div
                      key={acc.id || idx}
                      onClick={() => handleSwitchAccount(idx)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? "bg-blue-50/80 border border-blue-200/60"
                          : "hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {acc.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={acc.image}
                            alt={acc.name}
                            className="h-7 w-7 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white shrink-0">
                            {acc.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {acc.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-blue-600 mr-0.5" />
                        )}

                        {/* Individual Logout button on each account */}
                        <button
                          onClick={(e) =>
                            handleLogoutSingleAccount(e, acc, idx)
                          }
                          title={`Logout akun ${acc.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer p-0.5"
                        >
                          <LogOut className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <DropdownMenuSeparator />

              {/* Action: Add Account */}
              <DropdownMenuItem
                onClick={handleAddAccount}
                className="gap-2 text-xs text-blue-600 font-medium cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Akun Google Lain</span>
              </DropdownMenuItem>

              {/* Logout all accounts */}
              <DropdownMenuItem
                onClick={handleLogoutAllAccounts}
                className="gap-2 text-xs text-red-600 font-medium cursor-pointer focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                <span>Logout Semua Akun</span>
              </DropdownMenuItem>

              {/* Guide modal link */}
              <DropdownMenuItem
                onClick={() => setGuideOpen(true)}
                className="gap-2 text-xs text-slate-600 cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Panduan OAuth</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <OAuthSetupDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
