import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/auth/user-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Heart } from "lucide-react";
import { getServerAccounts, getServerStoreState } from "@/lib/server-account-store";
import { auth } from "@/lib/auth";
import { GoogleAccount } from "@/types/drive";
import { getSiteSession } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

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

  // Retrieve authenticated accounts and site session server-side
  let initialAccounts: GoogleAccount[] = [];
  let userRole: "admin" | "user" = "user";

  try {
    const [session, serverAccounts, serverState, siteSession] = await Promise.all([
      auth().catch(() => null),
      getServerAccounts().catch(() => []),
      getServerStoreState().catch(() => ({ loggedOut: false, loggedOutAt: 0, accounts: [] })),
      getSiteSession().catch(() => null),
    ]);

    // Enforce gate protection at layout level
    if (!siteSession || !siteSession.role) {
      redirect("/login");
    }

    userRole = siteSession.role;

    if (!serverState?.loggedOut) {
      if (Array.isArray(serverAccounts) && serverAccounts.length > 0) {
        initialAccounts = serverAccounts
          .filter((acc) => acc.email && acc.email.includes("@"))
          .map((acc, index) => ({
            id: acc.id || `account-${index}`,
            name: acc.name || "Akun Google",
            // Hide owner email completely for regular users for privacy
            email: userRole === "admin" ? acc.email || "" : "Akun Terverifikasi",
            image: acc.image || undefined,
            hasValidToken: Boolean(acc.refreshToken || acc.accessToken),
            isPrimaryEnv: Boolean(acc.isPrimaryEnv),
          }));
      } else if (session?.user && session.user.email) {
        initialAccounts = [
          {
            id: (session.user as any).id || "primary",
            name: session.user.name || "Akun Google",
            email: userRole === "admin" ? session.user.email || "" : "Akun Terverifikasi",
            image: session.user.image || undefined,
          },
        ];
      }
    }
  } catch (err) {
    console.warn("[AccountLayout] Failed to pre-resolve accounts:", err);
  }

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
            <UserNav accountIndex={accountIndex} initialAccounts={initialAccounts} userRole={userRole} />
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
