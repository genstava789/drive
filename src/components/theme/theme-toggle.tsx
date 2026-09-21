"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Sparkles,
  Laptop,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR skeleton placeholder to prevent layout shifts
  if (!mounted) {
    return (
      <div className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full border border-slate-200/80 bg-white/80 animate-pulse" />
    );
  }

  const isMidnight = theme === "midnight";
  const isLight = theme === "light" || (theme === "system" && resolvedTheme === "light");
  const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark" && !isMidnight);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all duration-150 active:scale-95 outline-none cursor-pointer group"
          title={`Ganti Tema (Aktif: ${
            theme === "midnight"
              ? "Midnight"
              : theme === "dark"
              ? "Dark"
              : theme === "light"
              ? "White Smoke"
              : "Sistem"
          })`}
          aria-label="Theme Switcher"
        >
          {isMidnight ? (
            <div className="relative flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-sky-400 transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            </div>
          ) : isLight ? (
            <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200 group-hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-400 transition-transform duration-200 group-hover:-rotate-12" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg">
        <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
          Pilihan Tema
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {/* White Smoke (Default Light) */}
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            theme === "light"
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>White Smoke</span>
          </div>
          {theme === "light" && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
        </DropdownMenuItem>

        {/* Midnight Palette (New Celestial Theme) */}
        <DropdownMenuItem
          onClick={() => setTheme("midnight")}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            theme === "midnight"
              ? "bg-sky-950/60 text-sky-300 font-semibold border border-sky-800/40"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Midnight</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Baru
              </span>
            </div>
          </div>
          {theme === "midnight" && <Check className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
        </DropdownMenuItem>

        {/* Dark Slate */}
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            theme === "dark"
              ? "bg-slate-100 text-slate-900 font-semibold"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span>Dark Slate</span>
          </div>
          {theme === "dark" && <Check className="h-3.5 w-3.5 text-slate-900 shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* System Auto */}
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            theme === "system"
              ? "bg-slate-100 text-slate-900 font-semibold"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Laptop className="h-3.5 w-3.5 text-slate-400" />
            <span>Sistem Otomatis</span>
          </div>
          {theme === "system" && <Check className="h-3.5 w-3.5 text-slate-900 shrink-0" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
