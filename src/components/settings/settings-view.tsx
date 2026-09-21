"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OAuthSetupDialog } from "@/components/auth/oauth-setup-dialog";
import {
  ArrowLeft,
  KeyRound,
  Shield,
  HardDrive,
  FileText,
  Folder,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Database,
  ExternalLink,
} from "lucide-react";

interface SettingsData {
  isAuthenticated: boolean;
  accountIndex: number;
  account: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    source: string;
  };
  storage: {
    limit: number;
    usage: number;
    usageInDrive: number;
    usageInDriveTrash: number;
    percentUsed: number;
  };
  stats: {
    totalFiles: number;
    totalFolders: number;
    totalTrash: number;
  };
}

interface SettingsViewProps {
  accountIndex: number;
}

export function SettingsView({ accountIndex }: SettingsViewProps) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  // Visibility states for sensitive credentials
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);

  // Copy success states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchSettings = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/drive/settings?accountIndex=${accountIndex}${
            forceRefresh ? "&refresh=true" : ""
          }`
        );
        if (!res.ok) {
          throw new Error("Gagal mengambil data pengaturan akun");
        }
        const json: SettingsData = await res.json();
        if (json.isAuthenticated === false) {
          setError("Sesi akun tidak aktif atau belum login ke Google Drive.");
        } else {
          setData(json);
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat pengaturan");
      } finally {
        setIsLoading(false);
      }
    },
    [accountIndex]
  );

  useEffect(() => {
    fetchSettings(false);
  }, [fetchSettings]);

  const copyToClipboard = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const copyEnvFormat = () => {
    if (!data?.credentials) return;
    const envText = `# Google OAuth 2.0 Credentials (LeviDrive)
GOOGLE_CLIENT_ID="${data.credentials.clientId}"
GOOGLE_CLIENT_SECRET="${data.credentials.clientSecret}"
GOOGLE_REFRESH_TOKEN="${data.credentials.refreshToken}"`;
    copyToClipboard(envText, "all-env");
  };

  const storageLimit = data?.storage?.limit || 0;
  const storageUsage = data?.storage?.usage || 0;
  const storageFree = Math.max(0, storageLimit - storageUsage);
  const percentUsed = data?.storage?.percentUsed || 0;

  // Determine progress bar color theme
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return "bg-rose-500";
    if (pct >= 75) return "bg-amber-500";
    return "bg-blue-600";
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-10">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <Link href={`/${accountIndex}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </div>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link
              href={`/${accountIndex}`}
              className="hover:text-blue-600 font-medium whitespace-nowrap"
            >
              My Drive
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Pengaturan</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSettings(true)}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs gap-1.5 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            <span>Segarkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setGuideOpen(true)}
            className="h-8 px-2.5 text-xs gap-1.5 text-blue-600 border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 shadow-2xs cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>Panduan OAuth</span>
          </Button>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Pengaturan &amp; Kredensial Akun
            </h1>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[10px]">
              Akun #{accountIndex}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Informasi kredensial Google OAuth, kuota penyimpanan, dan statistik
            berkas akun aktif.
          </p>
        </div>

        {data?.account && (
          <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
            {data.account.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.account.image}
                alt={data.account.name}
                className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-2xs"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-2xs">
                {data.account.name?.charAt(0) || "G"}
              </div>
            )}
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {data.account.name}
                </p>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[190px] sm:max-w-[220px]">
                {data.account.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 space-y-1">
          <p className="font-semibold">Perhatian:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Row 1: Storage Quota & File Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage Quota Card (Takes 2 columns) */}
        <div className="lg:col-span-2 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Kapasitas Penyimpanan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Penggunaan kuota Google Drive
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-bold text-slate-900 font-outfit">
                {formatBytes(storageUsage)}
              </span>
              <span className="text-xs text-slate-400 ml-1">
                / {storageLimit > 0 ? formatBytes(storageLimit) : "Unlimited"}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  percentUsed
                )}`}
                style={{ width: `${Math.min(100, Math.max(1, percentUsed))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Terpakai: {percentUsed}%</span>
              <span>
                Sisa Ruang:{" "}
                {storageLimit > 0 ? formatBytes(storageFree) : "Tidak terbatas"}
              </span>
            </div>
          </div>

          {/* Detailed Storage Breakdown */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Drive Berkas
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 font-outfit">
                {formatBytes(data?.storage?.usageInDrive || 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Sampah (Trash)
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 font-outfit">
                {formatBytes(data?.storage?.usageInDriveTrash || 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Batas Total
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 font-outfit">
                {storageLimit > 0 ? formatBytes(storageLimit) : "Unlimited"}
              </p>
            </div>
          </div>
        </div>

        {/* File & Folder Statistics Card (Takes 1 column) */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Statistik Konten
              </h3>
              <p className="text-[11px] text-slate-500">
                Jumlah berkas &amp; folder
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Total Berkas (Files)</span>
              </div>
              <span className="text-xs font-bold text-slate-900 font-outfit">
                {isLoading ? "..." : (data?.stats?.totalFiles || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                <span>Total Folder</span>
              </div>
              <span className="text-xs font-bold text-slate-900 font-outfit">
                {isLoading ? "..." : (data?.stats?.totalFolders || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Berkas di Sampah</span>
              </div>
              <span className="text-xs font-bold text-slate-900 font-outfit">
                {isLoading ? "..." : (data?.stats?.totalTrash || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Credentials Card (Client ID, Client Secret, Refresh Token) */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shadow-2xs">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kredensial Google OAuth 2.0
              </h2>
              <p className="text-xs text-slate-500">
                Informasi Client ID, Secret, dan Refresh Token untuk sinkronisasi
                API Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={copyEnvFormat}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 rounded-lg shadow-2xs cursor-pointer"
            >
              {copiedKey === "all-env" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>
                {copiedKey === "all-env" ? "Tersalin!" : "Salin Format .ENV"}
              </span>
            </Button>
          </div>
        </div>

        {/* Credentials Field List */}
        <div className="space-y-3.5">
          {/* 1. Google Client ID */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                GOOGLE_CLIENT_ID
              </label>
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                Public
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-800 break-all select-all overflow-x-auto">
                {data?.credentials?.clientId || "—"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    data?.credentials?.clientId || "",
                    "clientId"
                  )
                }
                className="h-9 px-3 shrink-0 text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                {copiedKey === "clientId" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                )}
              </Button>
            </div>
          </div>

          {/* 2. Google Client Secret */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                GOOGLE_CLIENT_SECRET
              </label>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                Secret
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-800 break-all select-all overflow-x-auto">
                {showSecret
                  ? data?.credentials?.clientSecret || "—"
                  : data?.credentials?.clientSecret
                  ? "••••••••••••••••••••••••••••••••••••••••"
                  : "—"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecret(!showSecret)}
                className="h-9 px-3 shrink-0 text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
                title={showSecret ? "Sembunyikan" : "Tampilkan"}
              >
                {showSecret ? (
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    data?.credentials?.clientSecret || "",
                    "clientSecret"
                  )
                }
                className="h-9 px-3 shrink-0 text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                {copiedKey === "clientSecret" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                )}
              </Button>
            </div>
          </div>

          {/* 3. Refresh Token */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                GOOGLE_REFRESH_TOKEN
              </label>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                Sesi Login Permanen
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-800 break-all select-all overflow-x-auto">
                {showToken
                  ? data?.credentials?.refreshToken || "—"
                  : data?.credentials?.refreshToken
                  ? "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                  : "—"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="h-9 px-3 shrink-0 text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
                title={showToken ? "Sembunyikan" : "Tampilkan"}
              >
                {showToken ? (
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    data?.credentials?.refreshToken || "",
                    "refreshToken"
                  )
                }
                className="h-9 px-3 shrink-0 text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                {copiedKey === "refreshToken" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Tips Footer */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <Database className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-blue-950">
              Sinkronisasi Cloud &amp; Multi-Device:
            </p>
            <p className="text-blue-800/90">
              Kredensial dan sesi login Anda disinkronkan secara aman ke Supabase
              database. Sesi ini tetap aktif di seluruh browser, laptop, maupun
              deployment Vercel/Netlify.
            </p>
          </div>
        </div>
      </div>

      {/* OAuth Setup Dialog */}
      <OAuthSetupDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
