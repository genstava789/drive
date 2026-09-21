"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

import { getStoredBreadcrumbs } from "@/lib/breadcrumbs";
import { BreadcrumbItem } from "@/types/drive";

interface FileDetailSkeletonProps {
  accountIndex?: number;
  driveId?: string;
}

export function FileDetailSkeleton({
  accountIndex = 0,
  driveId,
}: FileDetailSkeletonProps) {
  const parentBreadcrumbs = React.useMemo<BreadcrumbItem[]>(() => {
    if (typeof window !== "undefined" && driveId) {
      const stored = sessionStorage.getItem(`drive_breadcrumbs_${driveId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (_) {}
      }
      const parentId = sessionStorage.getItem(`drive_parent_${driveId}`);
      if (parentId && parentId !== "root") {
        return getStoredBreadcrumbs(parentId);
      }
    }
    return [{ id: "root", name: "My Drive" }];
  }, [driveId]);

  const parentFolder = parentBreadcrumbs[parentBreadcrumbs.length - 1];
  const backUrl =
    parentFolder && parentFolder.id !== "root"
      ? `/${accountIndex}/${parentFolder.id}?type=folder`
      : `/${accountIndex}`;

  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex items-center gap-2 px-0.5">
        <Link href={backUrl} prefetch={true}>
          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-2xs">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto no-scrollbar min-w-0 flex-1">
          {parentBreadcrumbs.map((crumb, idx) => {
            const isRoot = crumb.id === "root";
            const crumbUrl = isRoot
              ? `/${accountIndex}`
              : `/${accountIndex}/${crumb.id}?type=folder`;

            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <span className="shrink-0">/</span>}
                <Link
                  href={crumbUrl}
                  prefetch={true}
                  className="hover:text-blue-600 font-medium whitespace-nowrap shrink-0"
                >
                  {crumb.name}
                </Link>
              </React.Fragment>
            );
          })}
          <span className="shrink-0">/</span>
          <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Main File Card Skeleton */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-4 overflow-hidden w-full max-w-full">
        {/* Header with Icon, Title, and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 min-w-0 w-full">
          <div className="flex items-start gap-2.5 min-w-0 w-full sm:w-auto flex-1">
            {/* File Icon placeholder */}
            <div className="h-7 w-7 rounded-lg bg-slate-200 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              {/* File Title skeleton */}
              <div className="h-5 w-44 sm:w-72 bg-slate-200 rounded" />
              {/* Size badge skeleton */}
              <div className="h-4 w-16 bg-slate-100 border border-slate-200/60 rounded-full" />
            </div>
          </div>

          {/* Quick Actions (Download, Open Drive) */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            {/* Download Button skeleton */}
            <div className="flex-1 sm:flex-initial h-8 px-3 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center gap-1.5 min-w-[95px]">
              <Download className="h-3.5 w-3.5 text-blue-500/70" />
              <div className="h-3 w-12 bg-blue-500/30 rounded" />
            </div>

            {/* Open Drive Button skeleton */}
            <div className="flex-1 sm:flex-initial h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-center gap-1.5 min-w-[95px]">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              <div className="h-3 w-14 bg-slate-300/70 rounded" />
            </div>
          </div>
        </div>

        {/* Media / Preview Box Placeholder */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 h-44 sm:h-60 flex flex-col items-center justify-center p-4 gap-2.5">
          <div className="h-10 w-10 rounded-full bg-slate-200/80 flex items-center justify-center" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>

        {/* Metadata Rows Skeleton */}
        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-[#FAFAFB]/60 overflow-hidden w-full">
          {[
            { labelW: "w-20", valW: "w-40 sm:w-60" },
            { labelW: "w-16", valW: "w-32 sm:w-48" },
            { labelW: "w-24", valW: "w-24 sm:w-36" },
            { labelW: "w-22", valW: "w-28 sm:w-40" },
            { labelW: "w-24", valW: "w-28 sm:w-40" },
            { labelW: "w-18", valW: "w-36 sm:w-52" },
            { labelW: "w-14", valW: "w-20 sm:w-28" },
          ].map((row, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 sm:px-3.5 gap-2"
            >
              <div className="flex items-center gap-2 shrink-0 min-w-[95px] sm:min-w-[140px]">
                <div className="h-3.5 w-3.5 rounded bg-slate-200 shrink-0" />
                <div className={`h-3.5 ${row.labelW} bg-slate-200 rounded`} />
              </div>
              <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                <div className={`h-3.5 ${row.valW} bg-slate-200/80 rounded`} />
                <div className="h-6 w-6 rounded-md bg-slate-200/60 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Direct Download URL Card Skeleton */}
        <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 space-y-2 overflow-hidden w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
              <div className="h-3.5 w-36 bg-blue-200/70 rounded" />
            </div>
            <div className="h-3 w-16 bg-blue-200/60 rounded" />
          </div>
          <div className="w-full h-8 rounded-md border border-blue-100/80 bg-white/90 p-2" />
        </div>
      </div>
    </div>
  );
}
