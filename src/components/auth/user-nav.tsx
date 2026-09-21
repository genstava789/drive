"use client";

import React, { useState } from "react";
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
  UserCheck,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { OAuthSetupDialog } from "./oauth-setup-dialog";
import { MOCK_ACCOUNTS } from "@/lib/mock-data";

interface UserNavProps {
  accountIndex?: number;
}

export function UserNav({ accountIndex = 0 }: UserNavProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);

  // Collect accounts: either from active session.accounts or fallback to demo accounts
  const isRealAuth = !!session?.user;
  const accounts =
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

  // Active account based on accountIndex URL parameter
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

            <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg">
              <DropdownMenuLabel className="px-2 py-1">
                <p className="text-xs font-bold text-slate-800">Daftar Akun Google</p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Pilih akun untuk beralih instan
                </p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Account list */}
              <div className="space-y-1 py-1">
                {accounts.map((acc, idx) => {
                  const isActive = idx === accountIndex;
                  return (
                    <div
                      key={acc.id || idx}
                      onClick={() => handleSwitchAccount(idx)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? "bg-blue-50/80 border border-blue-200/60"
                          : "hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
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
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                          /{idx}
                        </span>
                        {isActive && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
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

              {/* Guide modal link */}
              <DropdownMenuItem
                onClick={() => setGuideOpen(true)}
                className="gap-2 text-xs text-slate-600 cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Panduan OAuth & credentials.json</span>
              </DropdownMenuItem>

              {isRealAuth && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/0" })}
                    className="gap-2 text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar (Sign Out)</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <OAuthSetupDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
