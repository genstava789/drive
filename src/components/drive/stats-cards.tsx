"use client";

import React from "react";
import { HardDrive, Folder, Files, Cloud } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { DriveFile } from "@/types/drive";

interface StatsCardsProps {
  files: DriveFile[];
  isMockData?: boolean;
}

export function StatsCards({ files, isMockData }: StatsCardsProps) {
  const folderCount = files.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder"
  ).length;
  const fileCount = files.length - folderCount;

  const totalBytes = files.reduce((acc, curr) => acc + (curr.size || 0), 0);

  // Storage usage estimate
  const usedStorageBytes = 5826000000; // ~5.42 GB
  const totalStorageBytes = 16106127360; // 15 GB
  const usagePercentage = Math.round(
    (usedStorageBytes / totalStorageBytes) * 100
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Card 1: Total Files */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Berkas</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Files className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            {fileCount}
          </span>
          <span className="text-xs text-slate-400">item</span>
        </div>
      </div>

      {/* Card 2: Total Folders */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Folder</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <Folder className="h-4 w-4" fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            {folderCount}
          </span>
          <span className="text-xs text-slate-400">direktori</span>
        </div>
      </div>

      {/* Card 3: Size in view */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Ukuran Folder Ini
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <HardDrive className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            {formatBytes(totalBytes)}
          </span>
        </div>
      </div>

      {/* Card 4: Google Cloud Storage Quota */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Penyimpanan</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Cloud className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">5.4 GB</span>
            <span className="text-slate-400 text-[11px]">dari 15 GB</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
