import React from "react";
import { UserNav } from "@/components/auth/user-nav";
import { DriveExplorer } from "@/components/drive/drive-explorer";
import { HardDrive, Sparkles, Shield, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-800">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  CloudVault
                </span>
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200/60">
                  Drive API
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Google Drive Explorer & Headless TanStack Data
              </p>
            </div>
          </div>

          {/* User Profile & OAuth Navigation */}
          <UserNav />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/70">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Google Drive Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Jelajahi, urutkan berkas, navigasi folder hierarkis, dan pratinjau dokumen Google Drive dengan tema White Smoke.
            </p>
          </div>

          {/* Quick tech tags */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium shadow-2xs">
              <Layers className="h-3 w-3 text-blue-500" /> Next.js 15+
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium shadow-2xs">
              <Sparkles className="h-3 w-3 text-amber-500" /> TanStack Table
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium shadow-2xs">
              <Shield className="h-3 w-3 text-emerald-500" /> Google OAuth
            </span>
          </div>
        </div>

        {/* Drive Explorer Component */}
        <DriveExplorer />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CloudVault Explorer</span>
            <span>•</span>
            <span>Desain tema White Smoke & Lucide Icons</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ditenagai oleh Google Drive API v3 & TanStack Table v8
          </p>
        </div>
      </footer>
    </div>
  );
}
