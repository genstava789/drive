"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export function FileDetailSkeleton() {
  return (
    <div className="w-full space-y-3 animate-in fade-in duration-200">
      {/* Top Breadcrumb - real text, no skeleton */}
      <div className="flex items-center gap-2 px-0.5">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700">
          <span>My Drive</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400 font-medium">Memuat berkas...</span>
        </div>
      </div>

      {/* Main Card Skeleton */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-start gap-2.5 min-w-0">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56 sm:w-80 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Preview Area Skeleton */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-6 flex flex-col items-center justify-center min-h-64 space-y-3">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>

        {/* Metadata Rows Skeleton */}
        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-[#FAFAFB]/60 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 sm:px-3.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
