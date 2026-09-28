"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Heart,
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

      const data = await res.json();

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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Clean White Card matching Drive Explorer styling */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800/90 dark:bg-slate-900/95 transition-colors">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs mb-3.5">
            <Lock className="h-5 w-5" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
            Akses Berkas Drive
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            Masukkan password akses yang diberikan oleh owner untuk menjelajahi dan mengunduh berkas.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
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
                className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 shadow-2xs transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
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

        {/* Security Badge & Info */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Akses aman berbasis peran & enkripsi PBKDF2</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F7F9] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-200 antialiased transition-colors duration-200">
      {/* Top Navbar Header - Identical to Drive Explorer navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 dark:bg-slate-900/85 dark:border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <BrandLogo accountIndex={0} />
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="hidden sm:inline-flex items-center text-xs font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              Akses Terproteksi
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
      <footer className="mt-auto border-t border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs py-4.5 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium tracking-normal">
          <span>Made with</span>
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 inline-block animate-pulse shrink-0" />
          <span>by <strong className="font-semibold text-slate-700 dark:text-slate-200">Levi</strong></span>
        </p>
      </footer>
    </div>
  );
}
