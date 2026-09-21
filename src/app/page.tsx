import React from "react";
import { UserNav } from "@/components/auth/user-nav";
import { DriveExplorer } from "@/components/drive/drive-explorer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-800">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo - LeviDrive */}
          <div className="flex items-center">
            <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-slate-900 select-none">
              Levi<span className="text-blue-600">Drive</span>
            </span>
          </div>

          {/* User Profile & OAuth Navigation */}
          <UserNav />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        <DriveExplorer />
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white py-4 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Made with love by Levi
        </p>
      </footer>
    </div>
  );
}
