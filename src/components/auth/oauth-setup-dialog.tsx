"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, KeyRound, ShieldAlert } from "lucide-react";

interface OAuthSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OAuthSetupDialog({ open, onOpenChange }: OAuthSetupDialogProps) {
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const callbackUrl = "http://localhost:3000/api/auth/callback/google";
  const envSample = `GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
AUTH_SECRET="custom_secret_key_antigravity_32_characters_random"
NEXTAUTH_URL="http://localhost:3000"`;

  const copyToClipboard = (text: string, type: "callback" | "env") => {
    navigator.clipboard.writeText(text);
    if (type === "callback") {
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <KeyRound className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Konfigurasi Google Drive API
            </span>
          </div>
          <DialogTitle className="text-xl">
            Panduan Menghubungkan Akun Google OAuth
          </DialogTitle>
          <DialogDescription>
            Ikuti 4 langkah mudah berikut untuk mengambil berkas Google Drive langsung dari akun Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 mt-2">
          {/* Step 1 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  1
                </span>
                Buka Google Cloud Console & Buat Project
              </span>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                Buka Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-slate-500 pl-7">
              Masuk ke Google Cloud Console, lalu buat Project baru (misal: <em>Drive Explorer Web</em>).
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  2
                </span>
                Aktifkan Google Drive API
              </span>
              <a
                href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                Library API <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-slate-500 pl-7">
              Cari <strong>Google Drive API</strong> di menu APIs & Services &gt; Library, kemudian klik <strong>Enable</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                3
              </span>
              Buat OAuth 2.0 Credentials (Web Application)
            </div>
            <p className="text-slate-500 pl-7">
              Di menu <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.
              Pilih Application Type <em>Web application</em>, lalu masukkan Authorized redirect URI:
            </p>
            <div className="ml-7 flex items-center justify-between rounded-md bg-white border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700">
              <span className="truncate">{callbackUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(callbackUrl, "callback")}
                className="h-6 px-2 text-xs"
              >
                {copiedCallback ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Tersalin
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" /> Salin
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  4
                </span>
                Salin Kredensial ke File .env.local
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(envSample, "env")}
                className="h-6 px-2 text-xs"
              >
                {copiedEnv ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Tersalin
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" /> Salin Format Env
                  </span>
                )}
              </Button>
            </div>
            <pre className="ml-7 rounded-md bg-slate-900 text-slate-200 p-2.5 font-mono text-[11px] overflow-x-auto">
              {envSample}
            </pre>
          </div>

          {/* Note */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 border border-amber-200/60 p-3 text-amber-800 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              <strong>Mode Demo Otomatis:</strong> Sambil menyiapkan kredensial Google di atas, Anda tetap dapat mencoba seluruh fitur antarmuka, sorting TanStack, pencarian, dan navigasi folder menggunakan data simulasi interaktif yang sudah kami sertakan!
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Tutup & Lanjutkan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
