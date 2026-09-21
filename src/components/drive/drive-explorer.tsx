"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BreadcrumbItem, DriveFile, DriveResponse, FileCategoryFilter } from "@/types/drive";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { DriveToolbar } from "./drive-toolbar";
import { DriveTable } from "./drive-table";
import { DriveGrid } from "./drive-grid";
import { getFileCategory } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { getActiveAccounts } from "@/lib/account-store";

interface DriveExplorerProps {
  accountIndex?: number;
  initialFolderId?: string;
  initialFolderName?: string;
}

export function DriveExplorer({
  accountIndex = 0,
  initialFolderId = "root",
  initialFolderName,
}: DriveExplorerProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMockData, setIsMockData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoAccount, setHasNoAccount] = useState<boolean>(false);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    useState<FileCategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Synchronize accounts state
  useEffect(() => {
    const checkAccounts = () => {
      const active = getActiveAccounts(session);
      if (active.length === 0) {
        setHasNoAccount(true);
        setFiles([]);
        setIsLoading(false);
      } else {
        setHasNoAccount(false);
        if (accountIndex >= active.length) {
          router.push("/0");
        }
      }
    };

    checkAccounts();
    window.addEventListener("levidrive_accounts_changed", checkAccounts);
    return () => {
      window.removeEventListener("levidrive_accounts_changed", checkAccounts);
    };
  }, [session, accountIndex, router]);

  // Fetch Drive items from API
  const fetchFiles = useCallback(
    async (folderId: string) => {
      const active = getActiveAccounts(session);
      if (active.length === 0) {
        setHasNoAccount(true);
        setFiles([]);
        setIsLoading(false);
        return;
      }
      setHasNoAccount(false);
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/drive?folderId=${encodeURIComponent(
            folderId
          )}&accountIndex=${accountIndex}`
        );
        if (!res.ok) {
          throw new Error(`Gagal memuat berkas: ${res.statusText}`);
        }
        const data: DriveResponse = await res.json();
        setFiles(data.files || []);
        setIsMockData(data.isMockData ?? true);

        if (folderId !== "root") {
          const folderName =
            data.currentFolderName || initialFolderName || folderId;
          setBreadcrumbs([
            { id: "root", name: "My Drive" },
            { id: folderId, name: folderName },
          ]);
        } else {
          setBreadcrumbs([{ id: "root", name: "My Drive" }]);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Terjadi kesalahan saat memuat berkas");
      } finally {
        setIsLoading(false);
      }
    },
    [accountIndex, initialFolderName, session]
  );

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId, fetchFiles, session]);

  // Navigate using breadcrumb
  const handleBreadcrumbNavigate = (folderId: string, index: number) => {
    if (folderId === "root") {
      router.push(`/${accountIndex}`);
    } else {
      router.push(`/${accountIndex}/${folderId}`);
    }
  };

  // Filter files based on category
  const filteredFiles = useMemo(() => {
    if (selectedCategory === "all") return files;
    return files.filter((file) => {
      const category = getFileCategory(file.mimeType);
      if (selectedCategory === "media") {
        return category === "image" || category === "video" || category === "audio";
      }
      return category === selectedCategory;
    });
  }, [files, selectedCategory]);

  return (
    <div className="w-full">
      {/* Explorer Main Content Card */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3">
        {/* Breadcrumb Path */}
        <BreadcrumbNav
          breadcrumbs={breadcrumbs}
          onNavigate={handleBreadcrumbNavigate}
        />

        {/* Toolbar: Search, View Mode, Refresh & Filter pills */}
        <DriveToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={() => fetchFiles(currentFolderId)}
          isLoading={isLoading}
          isMockData={isMockData}
        />

        {/* Error Notice */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-2 py-3">
            <Skeleton className="h-8.5 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ) : viewMode === "table" ? (
          /* Headless TanStack Table View with Route Navigation */
          <DriveTable
            data={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            searchQuery={searchQuery}
            hasNoAccount={hasNoAccount}
          />
        ) : (
          /* Visual Grid View with Route Navigation */
          <DriveGrid
            files={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            hasNoAccount={hasNoAccount}
          />
        )}
      </div>
    </div>
  );
}
