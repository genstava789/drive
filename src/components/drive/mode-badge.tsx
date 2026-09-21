"use client";

import React from "react";
import { Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModeBannerProps {
  isMockData: boolean;
  onOpenSetupGuide: () => void;
}

export function ModeBanner({
  isMockData,
  onOpenSetupGuide,
}: ModeBannerProps) {
  if (!isMockData) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-emerald-50/80 border border-emerald-200/80 px-4 py-2 text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Terhubung ke Google Drive API:</strong> Menampilkan berkas & folder aktual dari akun Google Drive Anda.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/70 border border-blue-200/70 p-3.5 shadow-2xs">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-800">
            Mode Demo Interaktif Aktif
          </p>
          <p className="text-[11px] text-slate-600 max-w-2xl">
            Aplikasi siap dicoba langsung! Anda dapat menguji sorting TanStack, pagination, pencarian berkas, dan navigasi ke dalam folder.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenSetupGuide}
        className="shrink-0 h-8 text-xs bg-white/90 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium"
      >
        <HelpCircle className="h-3.5 w-3.5 mr-1 text-blue-600" />
        Hubungkan Akun Google Anda
      </Button>
    </div>
  );
}
