"use client";

import React from "react";
import { BreadcrumbNav } from "@/components/drive/breadcrumb-nav";
import { DriveToolbar } from "@/components/drive/drive-toolbar";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";

export default function AccountLoading() {
  return (
    <div className="w-full">
      {/* Container card matching DriveExplorer */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        {/* Real static breadcrumb - zero skeleton */}
        <BreadcrumbNav
          breadcrumbs={[{ id: "root", name: "My Drive" }]}
          onNavigate={() => {}}
        />

        {/* Real static toolbar - zero skeleton on search, filter, or buttons */}
        <DriveToolbar
          searchQuery=""
          onSearchChange={() => {}}
          selectedCategory="all"
          onCategoryChange={() => {}}
          viewMode="table"
          onViewModeChange={() => {}}
          onRefresh={() => {}}
          isLoading={true}
        />

        {/* Drive Table Skeleton - ONLY loading the files and folders */}
        <DriveTableSkeleton rowCount={7} />
      </div>
    </div>
  );
}
