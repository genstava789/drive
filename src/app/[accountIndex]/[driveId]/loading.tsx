"use client";

import React, { useEffect, useState } from "react";
import { BreadcrumbNav } from "@/components/drive/breadcrumb-nav";
import { DriveToolbar } from "@/components/drive/drive-toolbar";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";
import { FileDetailSkeleton } from "@/components/drive/file-detail-skeleton";
import { getStoredBreadcrumbs } from "@/lib/breadcrumbs";

export default function DriveItemLoading() {
  const [navState, setNavState] = useState(() => {
    let driveId = "";
    let accountIndex = 0;
    let isFolder = true;

    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts[0]) accountIndex = parseInt(parts[0], 10) || 0;
      if (parts[1]) driveId = decodeURIComponent(parts[1]);
      else driveId = sessionStorage.getItem("drive_navigating_id") || "";

      const navType = sessionStorage.getItem("drive_navigating_type");
      if (navType === "file") {
        isFolder = false;
      } else if (navType === "folder") {
        isFolder = true;
      } else if (driveId) {
        const cachedType = sessionStorage.getItem(`drive_type_${driveId}`);
        if (cachedType === "file") isFolder = false;
      }
    }

    return { driveId, accountIndex, isFolder };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const accIdx = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
    const dId = parts[1]
      ? decodeURIComponent(parts[1])
      : sessionStorage.getItem("drive_navigating_id") || "";

    const navType = sessionStorage.getItem("drive_navigating_type");
    let folderFlag = true;
    if (navType === "file") {
      folderFlag = false;
    } else if (navType === "folder") {
      folderFlag = true;
    } else if (dId) {
      const cachedType = sessionStorage.getItem(`drive_type_${dId}`);
      if (cachedType === "file") folderFlag = false;
    }

    setNavState({ driveId: dId, accountIndex: accIdx, isFolder: folderFlag });
  }, []);

  if (!navState.isFolder) {
    return (
      <FileDetailSkeleton
        accountIndex={navState.accountIndex}
        driveId={navState.driveId}
      />
    );
  }

  const breadcrumbs = getStoredBreadcrumbs(navState.driveId);

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
