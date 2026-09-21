"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BreadcrumbNav } from "@/components/drive/breadcrumb-nav";
import { DriveToolbar } from "@/components/drive/drive-toolbar";
import { DriveTableSkeleton } from "@/components/drive/drive-table-skeleton";
import { FileDetailSkeleton } from "@/components/drive/file-detail-skeleton";

export default function DriveItemLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pathParts = (pathname || "").split("/").filter(Boolean);
  const accountIndex = pathParts[0] ? parseInt(pathParts[0], 10) || 0 : 0;
  const driveId = pathParts[1] ? decodeURIComponent(pathParts[1]) : "";
  const typeParam = searchParams?.get("type");

  const [isFolder, setIsFolder] = useState<boolean>(() => {
    if (typeParam === "folder" || driveId.startsWith("folder-")) {
      return true;
    }
    if (typeParam === "file") {
      return false;
    }
    if (typeof window !== "undefined" && driveId) {
      const cached = sessionStorage.getItem(`drive_type_${driveId}`);
      if (cached === "folder") return true;
      if (cached === "file") return false;
    }
    return false;
  });

  useEffect(() => {
    if (typeParam === "folder" || driveId.startsWith("folder-")) {
      setIsFolder(true);
      return;
    }
    if (typeParam === "file") {
      setIsFolder(false);
      return;
    }
    if (driveId && typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`drive_type_${driveId}`);
      if (cached === "folder") {
        setIsFolder(true);
      } else if (cached === "file") {
        setIsFolder(false);
      }
    }
  }, [driveId, typeParam]);

  if (isFolder) {
    let folderDisplayName = "Memuat...";
    if (typeof window !== "undefined" && driveId) {
      const cachedName = sessionStorage.getItem(`drive_folder_name_${driveId}`);
      if (cachedName) folderDisplayName = cachedName;
    }

    return (
      <div className="w-full">
        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
          <BreadcrumbNav
            breadcrumbs={[
              { id: "root", name: "My Drive" },
              { id: driveId || "folder", name: folderDisplayName },
            ]}
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

  return <FileDetailSkeleton accountIndex={accountIndex} />;
}
