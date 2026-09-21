"use client";

import React, { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
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
  Sparkles,
  CloudCheck,
} from "lucide-react";
import { OAuthSetupDialog } from "./oauth-setup-dialog";

export function UserNav() {
  const { data: session, status } = useSession();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGuideOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 border-slate-200 bg-white/80 hover:bg-slate-50"
        >
          <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
          <span>Setup Google OAuth</span>
        </Button>

        {status === "loading" ? (
          <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
        ) : session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 outline-none cursor-pointer">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}
                <span className="hidden md:inline-block text-xs font-medium text-slate-700 max-w-[120px] truncate">
                  {session.user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded mx-1 flex items-center gap-1.5">
                <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Terhubung ke Akun Google</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGuideOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5 mr-2 text-slate-500" />
                <span>Petunjuk API OAuth</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onClick={() => signOut()}
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                <span>Keluar (Sign Out)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs flex items-center gap-2"
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
        )}
      </div>

      <OAuthSetupDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
