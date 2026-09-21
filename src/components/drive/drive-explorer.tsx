"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BreadcrumbItem, DriveFile, DriveResponse, FileCategoryFilter, GoogleAccount } from "@/types/drive";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { DriveToolbar } from "./drive-toolbar";
import { DriveTable } from "./drive-table";
import { DriveGrid } from "./drive-grid";
import { getFileCategory } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { getActiveAccounts, fetchCachedServerAccounts } from "@/lib/account-store";
import { DriveTableSkeleton } from "./drive-table-skeleton";

interface ClientFolderCacheEntry {
  files: DriveFile[];
  currentFolderName?: string;
  timestamp: number;
}
const clientFolderCache = new Map<string, ClientFolderCacheEntry>();
const CLIENT_CACHE_TTL_MS = 60000; // 60 seconds client cache

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

  const cacheKey = `${accountIndex}_${initialFolderId}`;
  const initialCached = clientFolderCache.get(cacheKey);
  const isInitialCachedFresh =
    initialCached && Date.now() - initialCached.timestamp < CLIENT_CACHE_TTL_MS;

  const [files, setFiles] = useState<DriveFile[]>(() => {
    return isInitialCachedFresh ? initialCached.files : [];
  });
  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => {
    if (initialFolderId && initialFolderId !== "root") {
      let name = initialFolderName;
      if (!name && typeof window !== "undefined") {
        name = sessionStorage.getItem(`drive_folder_name_${initialFolderId}`) || "";
      }
      return [
        { id: "root", name: "My Drive" },
        { id: initialFolderId, name: name || "Memuat..." },
      ];
    }
    return [{ id: "root", name: "My Drive" }];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !isInitialCachedFresh;
  });
  const [isMockData, setIsMockData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNoAccount, setHasNoAccount] = useState<boolean>(false);
  const [serverAccounts, setServerAccounts] = useState<GoogleAccount[]>([]);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    useState<FileCategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Fetch Drive items from API
  const fetchFiles = useCallback(
    async (folderId: string, isManualRefresh = false) => {
      const activeCacheKey = `${accountIndex}_${folderId}`;
      const cached = clientFolderCache.get(activeCacheKey);
      const isFresh =
        cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

      // If fresh cache exists and not manual refresh, use it immediately
      if (isFresh && !isManualRefresh) {
        setFiles(cached.files);
        setIsLoading(false);
        return;
      }

      if (!cached || isManualRefresh) {
        setIsLoading(true);
      }

      setError(null);
      try {
        const res = await fetch(
          `/api/drive?folderId=${encodeURIComponent(
            folderId
          )}&accountIndex=${accountIndex}${isManualRefresh ? "&refresh=true" : ""}`
        );
        if (!res.ok) {
          throw new Error(`Gagal memuat berkas: ${res.statusText}`);
        }
        const data: DriveResponse = await res.json();
        const incomingFiles = data.files || [];
        setFiles(incomingFiles);
        setIsMockData(data.isMockData ?? false);

        // Authoritative authentication state from server:
        if (data.isAuthenticated === false) {
          setHasNoAccount(true);
          setFiles([]);
          clientFolderCache.delete(activeCacheKey);
        } else {
          setHasNoAccount(false);
          clientFolderCache.set(activeCacheKey, {
            files: incomingFiles,
            currentFolderName: data.currentFolderName,
            timestamp: Date.now(),
          });
        }

        if (folderId !== "root") {
          let folderName =
            data.currentFolderName || initialFolderName;
          if (!folderName && typeof window !== "undefined") {
            folderName =
              sessionStorage.getItem(`drive_folder_name_${folderId}`) || "";
          }
          folderName = folderName || folderId;
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
        if (!cached) setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accountIndex, initialFolderName]
  );

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId, fetchFiles]);

  // Synchronize accounts state with server and browser session
  useEffect(() => {
    let isMounted = true;
    const checkAccounts = async (isExplicitEvent = false) => {
      let currentServerAccounts: GoogleAccount[] = [];
      try {
        currentServerAccounts = await fetchCachedServerAccounts(isExplicitEvent);
        if (isMounted) setServerAccounts(currentServerAccounts);
      } catch (_) {}

      if (!isMounted) return;

      const active = getActiveAccounts(session, currentServerAccounts);
      if (isExplicitEvent) {
        if (active.length === 0) {
          setHasNoAccount(true);
          setFiles([]);
          clientFolderCache.clear();
        } else {
          setHasNoAccount(false);
          fetchFiles(currentFolderId, true);
        }
      } else {
        if (active.length > 0 && accountIndex >= active.length) {
          router.push("/0");
        }
      }
    };

    checkAccounts(false);
    const onAccountsChanged = () => {
      clientFolderCache.clear();
      checkAccounts(true);
    };
    window.addEventListener("levidrive_accounts_changed", onAccountsChanged);
    window.addEventListener("focus", onAccountsChanged);
    document.addEventListener("visibilitychange", onAccountsChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("levidrive_accounts_changed", onAccountsChanged);
      window.removeEventListener("focus", onAccountsChanged);
      document.removeEventListener("visibilitychange", onAccountsChanged);
    };
  }, [session, accountIndex, router, currentFolderId, fetchFiles]);

  useEffect(() => {
    if (typeof window !== "undefined" && initialFolderId && initialFolderId !== "root") {
      sessionStorage.setItem(`drive_type_${initialFolderId}`, "folder");
    }
  }, [initialFolderId]);

  // Navigate using breadcrumb
  const handleBreadcrumbNavigate = (folderId: string, index: number) => {
    if (folderId === "root") {
      router.push(`/${accountIndex}`);
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`drive_type_${folderId}`, "folder");
      }
      router.push(`/${accountIndex}/${folderId}?type=folder`);
    }
  };

  // Filter files based on category
  const filteredFiles = useMemo(() => {
    if (selectedCategory === "all") return files;
    return files.filter((file) => {
      if (selectedCategory === "file") {
        return file.mimeType !== "application/vnd.google-apps.folder";
      }
      const category = getFileCategory(file.mimeType, file.name);
      if (selectedCategory === "media") {
        return category === "video" || category === "audio";
      }
      return category === selectedCategory;
    });
  }, [files, selectedCategory]);

  const isFiltered = selectedCategory !== "all" || Boolean(searchQuery.trim());

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
          onRefresh={() => fetchFiles(currentFolderId, true)}
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
          <DriveTableSkeleton rowCount={7} />
        ) : viewMode === "table" ? (
          /* Headless TanStack Table View with Route Navigation */
          <DriveTable
            data={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            searchQuery={searchQuery}
            isFiltered={isFiltered}
            hasNoAccount={hasNoAccount}
          />
        ) : (
          /* Visual Grid View with Route Navigation */
          <DriveGrid
            files={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            searchQuery={searchQuery}
            isFiltered={isFiltered}
            hasNoAccount={hasNoAccount}
          />
        )}
      </div>
    </div>
  );
}
