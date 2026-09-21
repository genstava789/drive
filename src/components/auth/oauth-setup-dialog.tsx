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
  const [copiedLocalCallback, setCopiedLocalCallback] = useState(false);
  const [copiedVercelCallback, setCopiedVercelCallback] = useState(false);
  const [copiedVercelOrigin, setCopiedVercelOrigin] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const localCallbackUrl = "http://localhost:3000/api/auth/callback/google";
  const vercelCallbackUrl =
    "https://drive-iota-vert.vercel.app/api/auth/callback/google";
  const vercelOrigin = "https://drive-iota-vert.vercel.app";

  const envSample = `GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
AUTH_SECRET="your-random-secure-auth-secret-key"
NEXTAUTH_URL="https://drive-iota-vert.vercel.app"
AUTH_URL="https://drive-iota-vert.vercel.app"`;

  const copyText = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <KeyRound className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Konfigurasi Google Drive API & Vercel
            </span>
          </div>
          <DialogTitle className="text-xl">
            Panduan Menghubungkan Akun Google OAuth
          </DialogTitle>
          <DialogDescription>
            Panduan lengkap agar login Google berfungsi di localhost dan Vercel tanpa error &quot;Access blocked: Authorization Error&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 mt-2">
          {/* Troubleshooting Warning */}
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-red-900">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Solusi Error &quot;Access blocked: Authorization Error&quot; di Vercel
            </p>
            <p className="text-[11px] leading-relaxed">
              Pesan error dari Google ini terjadi karena <strong>Authorized redirect URIs</strong> di Google Cloud Console belum menyertakan URL Vercel dengan path <code>/api/auth/callback/google</code>, atau tipe OAuth Client bukan <strong>Web application</strong>.
            </p>
          </div>

          {/* Step 1 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  1
                </span>
                Buka Google Cloud Console & Library API
              </span>
              <a
                href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
              >
                Google Drive API <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-slate-500 pl-7 text-xs">
              Pastikan <strong>Google Drive API</strong> sudah berstatus <strong>ENABLED</strong> pada project Anda.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                2
              </span>
              Atur OAuth Client ID (Wajib Type: Web Application)
            </div>
            <p className="text-slate-500 pl-7 text-xs">
              Masuk ke <strong>APIs & Services &gt; Credentials</strong>, edit OAuth Client ID Anda (atau buat baru bertipe <strong>Web application</strong>). Tambahkan URL berikut:
            </p>

            {/* Vercel Redirect URI */}
            <div className="ml-7 space-y-1">
              <span className="text-[11px] font-semibold text-slate-700">
                A. Authorized redirect URIs (Wajib Ditambahkan):
              </span>
              <div className="flex items-center justify-between rounded-md bg-white border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
                <span className="truncate">{vercelCallbackUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyText(vercelCallbackUrl, setCopiedVercelCallback)
                  }
                  className="h-6 px-2 text-xs"
                >
                  {copiedVercelCallback ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Tersalin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Salin
                    </span>
                  )}
                </Button>
              </div>

              {/* Localhost Redirect URI */}
              <div className="flex items-center justify-between rounded-md bg-white border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
                <span className="truncate">{localCallbackUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyText(localCallbackUrl, setCopiedLocalCallback)
                  }
                  className="h-6 px-2 text-xs"
                >
                  {copiedLocalCallback ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Tersalin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Salin
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Vercel JavaScript Origin */}
            <div className="ml-7 space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-slate-700">
                B. Authorized JavaScript origins:
              </span>
              <div className="flex items-center justify-between rounded-md bg-white border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
                <span className="truncate">{vercelOrigin}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyText(vercelOrigin, setCopiedVercelOrigin)
                  }
                  className="h-6 px-2 text-xs"
                >
                  {copiedVercelOrigin ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Tersalin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Salin
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step 3: OAuth Consent Screen Test Users */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                3
              </span>
              OAuth Consent Screen: Tambahkan Test Users
            </div>
            <p className="text-slate-500 pl-7 text-xs leading-relaxed">
              Jika aplikasi Anda masih berstatus <strong>Testing</strong> di Google Cloud, buka menu <strong>OAuth consent screen &gt; Test users</strong>, lalu klik <strong>+ ADD USERS</strong> dan masukkan alamat email Google Anda.
            </p>
          </div>

          {/* Step 4: Environment Variables on Vercel */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  4
                </span>
                Environment Variables di Vercel Dashboard
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyText(envSample, setCopiedEnv)}
                className="h-6 px-2 text-xs"
              >
                {copiedEnv ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Tersalin
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Salin Env
                  </span>
                )}
              </Button>
            </div>
            <p className="text-slate-500 pl-7 text-xs">
              Pada <strong>Vercel Dashboard &gt; Project Settings &gt; Environment Variables</strong>, pastikan variabel berikut terisi:
            </p>
            <pre className="ml-7 rounded-md bg-slate-900 text-slate-200 p-2.5 font-mono text-[10px] sm:text-[11px] overflow-x-auto">
              {envSample}
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Tutup & Lanjutkan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
