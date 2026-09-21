"use client";

import React, { useEffect, useState } from "react";
import { BreadcrumbNav } from "@/components/drive/breadcrumb-nav";
import { DriveToolbar } from "@/components/drive/drive-toolbar";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";
import { FileDetailSkeleton } from "@/components/drive/file-detail-skeleton";
import { getStoredBreadcrumbs } from "@/lib/breadcrumbs";

/**
 * DriveItemLoading provides an instant skeleton fallback without ever suspending.
 * NOTE: We deliberately avoid useSearchParams() here because using useSearchParams()
 * inside a Suspense boundary fallback causes Next.js to suspend the fallback itself,
 * producing an empty body / blank screen before the skeleton appears.
 */
export default function DriveItemLoading() {
  const [navState, setNavState] = useState(() => {
    let driveId = "";
    let accountIndex = 0;
    let isFolder = true;

    if (typeof window !== "undefined") {
      const locParts = window.location.pathname.split("/").filter(Boolean);
      if (locParts[0]) {
        accountIndex = parseInt(locParts[0], 10) || 0;
      }
      if (locParts[1]) {
        driveId = decodeURIComponent(locParts[1]);
      } else {
        const storedNavId = sessionStorage.getItem("drive_navigating_id");
        if (storedNavId) driveId = storedNavId;
      }

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

    const locParts = window.location.pathname.split("/").filter(Boolean);
    const accIdx = locParts[0] ? parseInt(locParts[0], 10) || 0 : 0;
    const currentDriveId = locParts[1]
      ? decodeURIComponent(locParts[1])
      : sessionStorage.getItem("drive_navigating_id") || "";

    const navType = sessionStorage.getItem("drive_navigating_type");
    let folderFlag = true;

    if (navType === "file") {
      folderFlag = false;
    } else if (navType === "folder") {
      folderFlag = true;
    } else if (currentDriveId) {
      const cachedType = sessionStorage.getItem(`drive_type_${currentDriveId}`);
      if (cachedType === "file") folderFlag = false;
    }

    setNavState({
      driveId: currentDriveId,
      accountIndex: accIdx,
      isFolder: folderFlag,
    });
  }, []);

  if (!navState.isFolder) {
    return (
      <FileDetailSkeleton
        accountIndex={navState.accountIndex}
        driveId={navState.driveId}
      />
    );
  }

  const breadcrumbChain = getStoredBreadcrumbs(navState.driveId);

  return (
    <div className="w-full animate-in fade-in duration-150">
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        <BreadcrumbNav
          breadcrumbs={breadcrumbChain}
          onNavigate={() => {}}
        />

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
