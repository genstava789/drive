import React from "react";
import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { Heart } from "lucide-react";

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ accountIndex: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-800 antialiased">
      {/* Persistent Top Navbar Header - Always visible, never replaced by loading skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo - LeviDrive with Outfit typography */}
          <Link href={`/${accountIndex}`} className="flex items-center group">
            <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-slate-900 select-none transition-transform group-hover:scale-[1.01]">
              Levi<span className="text-blue-600">Drive</span>
            </span>
          </Link>

          {/* User Profile & Multi-Account Navigation */}
          <UserNav accountIndex={accountIndex} />
        </div>
      </header>

      {/* Main Content Area - File table & pages render here */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5.5">
        {children}
      </main>

      {/* Clean Footer with Heart Icon and Refined Typography */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white/80 backdrop-blur-xs py-4.5 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium tracking-normal">
          <span>Made with</span>
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 inline-block animate-pulse shrink-0" />
          <span>by <strong className="font-semibold text-slate-700">Levi</strong></span>
        </p>
      </footer>
    </div>
  );
}
