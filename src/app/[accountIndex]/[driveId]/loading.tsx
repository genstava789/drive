"use client";

import React, { useEffect, useState } from "react";
import { BreadcrumbNav } from "@/components/drive/breadcrumb-nav";
import { DriveToolbar } from "@/components/drive/drive-toolbar";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";
import { getStoredBreadcrumbs } from "@/lib/breadcrumbs";

export default function FolderLoading() {
  const [driveId, setDriveId] = useState(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts[1]) return decodeURIComponent(parts[1]);
      return sessionStorage.getItem("drive_navigating_id") || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const dId = parts[1]
      ? decodeURIComponent(parts[1])
      : sessionStorage.getItem("drive_navigating_id") || "";
    setDriveId(dId);
  }, []);

  const breadcrumbs = getStoredBreadcrumbs(driveId);

  return (
    <div className="w-full animate-in fade-in duration-150">
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={() => {}} />

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

        <DriveTableSkeleton rowCount={7} />
      </div>
    </div>
  );
}
