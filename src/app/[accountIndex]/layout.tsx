import React from "react";
import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandLogo } from "@/components/layout/brand-logo";
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
          {/* Brand Logo - LeviDrive with instant root navigation */}
          <BrandLogo accountIndex={accountIndex} />

          {/* Right Header Controls: Theme Switcher & Multi-Account Navigation */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <UserNav accountIndex={accountIndex} />
          </div>
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
