import React from "react";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="w-full">
      {/* Container card matching DriveExplorer */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 py-1 px-0.5">
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
          <Skeleton className="h-9 w-full sm:max-w-xs rounded-lg" />
          <div className="flex items-center gap-1.5 justify-end">
            <Skeleton className="h-8.5 w-16 rounded-lg" />
            <Skeleton className="h-8.5 w-8.5 rounded-lg" />
            <Skeleton className="h-8.5 w-8.5 rounded-lg" />
          </div>
        </div>

        {/* Drive Table Skeleton */}
        <DriveTableSkeleton rowCount={8} />
      </div>
    </div>
  );
}
