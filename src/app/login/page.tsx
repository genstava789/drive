"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Heart,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/0";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [telegramLink, setTelegramLink] = useState("https://t.me/synerize");

  // Fetch real-time Telegram link from public gate config
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/gate/config")
      .then((res) => res.json())
      .then((data: any) => {
        if (isMounted && data?.telegramLink) {
          setTelegramLink(data.telegramLink);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/gate/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error || "Password salah. Silakan periksa kembali atau hubungi owner."
        );
        setIsLoading(false);
        return;
      }

      // Success! Redirect to target page or /0
      const target = callbackUrl.startsWith("/") ? callbackUrl : "/0";
      window.location.href = target;
    } catch (err: any) {
      setErrorMessage("Terjadi gangguan koneksi. Silakan coba beberapa saat lagi.");
      setIsLoading(false);
    }
  };

  const formattedTelegramUrl = telegramLink.startsWith("http")
    ? telegramLink
    : `https://${telegramLink.replace(/^@/, "t.me/")}`;

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* Clean, minimalist card matching Drive Explorer styling */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs transition-colors">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Simplified Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Password Akses
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                disabled={isLoading}
                autoFocus
                required
                className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15 disabled:opacity-60 shadow-2xs transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-4 shadow-xs active:scale-[0.99] transition duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Buka Akses Drive</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Telegram Social Icon Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center">
          <a
            href={formattedTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 hover:bg-[#229ED9]/15 border border-slate-200/90 hover:border-[#229ED9]/40 shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer"
            title={`Hubungi via Telegram (${formattedTelegramUrl})`}
            aria-label="Telegram"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-[#229ED9] group-hover:scale-110 transition-transform"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F7F9] text-slate-800 antialiased transition-colors duration-200">
      {/* Top Navbar Header - Responsive & visible on all screen sizes */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <BrandLogo accountIndex={0} />
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Responsively styled badge: visible on both small and large screens */}
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-mono font-medium text-slate-600 bg-slate-100/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-200/80 shadow-2xs shrink-0 whitespace-nowrap">
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 shrink-0" />
              <span>Akses Terproteksi</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Refined Footer - Identical to Drive Explorer footer */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white/80 backdrop-blur-xs py-4.5 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium tracking-normal">
          <span>Made with</span>
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 inline-block animate-pulse shrink-0" />
          <span>
            by <strong className="font-semibold text-slate-700">Levi</strong>
          </span>
        </p>
      </footer>
    </div>
  );
}
