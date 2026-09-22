"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DriveTableSkeletonProps {
  rowCount?: number;
}

export function DriveTableSkeleton({ rowCount = 5 }: DriveTableSkeletonProps) {
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div className="w-full space-y-2">
      {/* Lightweight Table Container Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Minimal Table Header Bar */}
        <div className="h-9 px-3.5 sm:px-4 flex items-center justify-between border-b border-slate-200/80 bg-[#F8F9FA]/90 text-xs font-semibold text-slate-500 select-none">
          <span className="w-32">Nama</span>
          <div className="hidden sm:flex items-center gap-8">
            <span className="w-20">Tipe</span>
            <span className="w-16">Ukuran</span>
            <span className="w-24 hidden md:inline">Diubah</span>
          </div>
          <span className="w-6 text-right"></span>
        </div>

        {/* Lightweight Skeleton Rows */}
        <div className="divide-y divide-slate-100">
          {rows.map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 gap-3"
            >
              {/* File / Folder Icon & Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Skeleton className="h-7 w-7 rounded-lg shrink-0 bg-slate-200/70" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton
                    className={`h-3.5 rounded ${
                      idx % 3 === 0 ? "w-48 sm:w-64" : idx % 2 === 0 ? "w-36 sm:w-48" : "w-40 sm:w-56"
                    }`}
                  />
                  <div className="sm:hidden">
                    <Skeleton className="h-2.5 w-24 rounded" />
                  </div>
                </div>
              </div>

              {/* Desktop Columns */}
              <div className="hidden sm:flex items-center gap-8 shrink-0">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-3.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-20 rounded hidden md:block" />
              </div>

              {/* Action Button Placeholder */}
              <Skeleton className="h-6 w-6 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Subtle bottom indicator */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>Memuat data berkas...</span>
      </div>
    </div>
  );
}
