import React from "react";
import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { DriveExplorer } from "@/components/drive/drive-explorer";

interface AccountPageProps {
  params: Promise<{ accountIndex: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-800">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo - LeviDrive */}
          <Link href={`/${accountIndex}`} className="flex items-center">
            <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-slate-900 select-none">
              Levi<span className="text-blue-600">Drive</span>
            </span>
          </Link>

          {/* User Profile & Multi-Account Navigation */}
          <UserNav accountIndex={accountIndex} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        <DriveExplorer accountIndex={accountIndex} />
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
