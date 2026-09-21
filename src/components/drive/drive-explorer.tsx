"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BreadcrumbItem, DriveFile, DriveResponse, FileCategoryFilter, GoogleAccount } from "@/types/drive";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { DriveToolbar } from "./drive-toolbar";
import { DriveTable } from "./drive-table";
import { DriveGrid } from "./drive-grid";
import { getFileCategory } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Sparkles } from "lucide-react";
import { getActiveAccounts, fetchCachedServerAccounts } from "@/lib/account-store";
import {
  getStoredBreadcrumbs,
  saveBreadcrumbsForFolder,
  appendBreadcrumb,
  recordFolderNavigation,
} from "@/lib/breadcrumbs";
import { DriveTableSkeleton } from "./drive-table-skeleton";
import { FileDetailSkeleton } from "./file-detail-skeleton";

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
  initialBreadcrumbs?: BreadcrumbItem[];
}

export function DriveExplorer({
  accountIndex = 0,
  initialFolderId = "root",
  initialFolderName,
  initialBreadcrumbs,
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
    if (initialBreadcrumbs && initialBreadcrumbs.length > 0) {
      if (typeof window !== "undefined" && initialFolderId) {
        saveBreadcrumbsForFolder(initialFolderId, initialBreadcrumbs);
      }
      return initialBreadcrumbs;
    }
    if (initialFolderId && initialFolderId !== "root") {
      const stored = getStoredBreadcrumbs(initialFolderId, initialFolderName);
      if (stored && stored.length > 0) {
        if (initialFolderName) {
          stored[stored.length - 1].name = initialFolderName;
          saveBreadcrumbsForFolder(initialFolderId, stored);
        }
        return stored;
      }
      return [
        { id: "root", name: "My Drive" },
        { id: initialFolderId, name: initialFolderName || "Folder" },
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
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<FileCategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [navigatingFileId, setNavigatingFileId] = useState<string | null>(null);

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
          )}&accountIndex=${accountIndex}${isManualRefresh ? "&refresh=true" : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(`Gagal memuat berkas: ${res.statusText}`);
        }
        const data: DriveResponse = await res.json();
        const incomingFiles = data.files || [];
        setFiles(incomingFiles);
        setIsMockData(data.isMockData ?? false);

        // Authoritative authentication state from server:
        if (data.isAuthenticated === false && !session?.user && !session?.accessToken) {
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
          setBreadcrumbs((prev) => {
            // 1. If server returned authoritative breadcrumb hierarchy, prioritize it
            if (data.breadcrumbs && data.breadcrumbs.length > 0) {
              saveBreadcrumbsForFolder(folderId, data.breadcrumbs);
              return data.breadcrumbs;
            }

            // 2. If prev already ends with folderId, retain prev and update name if needed
            if (prev.length > 0 && prev[prev.length - 1].id === folderId) {
              if (data.currentFolderName && prev[prev.length - 1].name !== data.currentFolderName) {
                const updated = [...prev];
                updated[updated.length - 1].name = data.currentFolderName;
                saveBreadcrumbsForFolder(folderId, updated);
                return updated;
              }
              return prev;
            }

            // 3. If folderId already exists in prev (navigating back up the tree), slice to it
            const existingIdx = prev.findIndex((b) => b.id === folderId);
            if (existingIdx !== -1) {
              const sliced = prev.slice(0, existingIdx + 1);
              if (data.currentFolderName) {
                sliced[sliced.length - 1].name = data.currentFolderName;
              }
              saveBreadcrumbsForFolder(folderId, sliced);
              return sliced;
            }

            // 4. Check stored breadcrumbs (only if deeper than just root + current)
            const stored = getStoredBreadcrumbs(
              folderId,
              data.currentFolderName || initialFolderName
            );
            if (stored && stored.length > 1) {
              if (data.currentFolderName) {
                stored[stored.length - 1].name = data.currentFolderName;
                saveBreadcrumbsForFolder(folderId, stored);
              }
              return stored;
            }

            // 5. Fallback: append folderId to prev
            const folderName =
              data.currentFolderName || initialFolderName || folderId;
            const appended = appendBreadcrumb(prev, {
              id: folderId,
              name: folderName,
            });
            saveBreadcrumbsForFolder(folderId, appended);
            return appended;
          });
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

  // Global search across all folders and subfolders in Google Drive
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!trimmed) {
      if (isGlobalSearchActive) {
        setIsGlobalSearchActive(false);
        setIsSearching(false);
        const activeCacheKey = `${accountIndex}_${currentFolderId}`;
        const cached = clientFolderCache.get(activeCacheKey);
        if (cached) {
          setFiles(cached.files);
        } else {
          fetchFiles(currentFolderId);
        }
      }
      return;
    }

    // Debounce 350ms for smooth typing and minimal API calls
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setIsGlobalSearchActive(true);
      try {
        const res = await fetch(
          `/api/drive?folderId=${encodeURIComponent(
            currentFolderId
          )}&accountIndex=${accountIndex}&query=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data: DriveResponse = await res.json();
          setFiles(data.files || []);
        }
      } catch (err) {
        console.error("Pencarian global error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, accountIndex, currentFolderId, fetchFiles, isGlobalSearchActive]);

  // Synchronize accounts state with server and browser session
  useEffect(() => {
    let isMounted = true;
    const checkAccounts = async (forceRefresh = false) => {
      let currentServerAccounts: GoogleAccount[] = [];
      try {
        currentServerAccounts = await fetchCachedServerAccounts(forceRefresh);
        if (isMounted) setServerAccounts(currentServerAccounts);
      } catch (_) {}

      if (!isMounted) return;

      const active = getActiveAccounts(session, currentServerAccounts);
      const isUserAuthenticated = Boolean(
        session?.user ||
        session?.accessToken ||
        active.length > 0
      );

      if (!isUserAuthenticated) {
        setHasNoAccount(true);
        setFiles([]);
        clientFolderCache.clear();
      } else {
        setHasNoAccount(false);
      }
    };

    checkAccounts(Boolean(session));
    const onAccountsChanged = () => {
      clientFolderCache.clear();
      checkAccounts(true);
    };
    window.addEventListener("levidrive_accounts_changed", onAccountsChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("levidrive_accounts_changed", onAccountsChanged);
    };
  }, [session]);

  useEffect(() => {
    if (typeof window !== "undefined" && initialFolderId && initialFolderId !== "root") {
      sessionStorage.setItem(`drive_type_${initialFolderId}`, "folder");
      if (initialFolderName) {
        sessionStorage.setItem(`drive_folder_name_${initialFolderId}`, initialFolderName);
      }
    }
  }, [initialFolderId, initialFolderName]);

  // Prefetch folder files into client cache in the background
  const prefetchFolder = useCallback(
    async (folderId: string) => {
      if (!folderId || folderId === "root") return;
      const activeCacheKey = `${accountIndex}_${folderId}`;
      const cached = clientFolderCache.get(activeCacheKey);
      if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
        return; // Already fresh
      }

      try {
        const res = await fetch(
          `/api/drive?folderId=${encodeURIComponent(folderId)}&accountIndex=${accountIndex}`
        );
        if (res.ok) {
          const data: DriveResponse = await res.json();
          if (data.files) {
            clientFolderCache.set(activeCacheKey, {
              files: data.files,
              currentFolderName: data.currentFolderName,
              timestamp: Date.now(),
            });
          }
        }
      } catch (_) {}
    },
    [accountIndex]
  );

  // Instant in-app folder navigation (0ms without page reload)
  const handleFolderClick = useCallback(
    (folder: { id: string; name: string }) => {
      // 1. Immediately update breadcrumbs in memory & sessionStorage
      const updated = recordFolderNavigation(breadcrumbs, folder);
      setBreadcrumbs(updated);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("drive_navigating_id", folder.id);
        sessionStorage.setItem("drive_navigating_type", "folder");
        sessionStorage.setItem(`drive_type_${folder.id}`, "folder");
        sessionStorage.setItem(`drive_folder_name_${folder.id}`, folder.name);
      }

      setSearchQuery("");

      // 2. Update browser URL without destroying/remounting component
      const targetUrl = `/${accountIndex}/${folder.id}?type=folder`;
      window.history.pushState(
        { folderId: folder.id, accountIndex },
        "",
        targetUrl
      );

      // 3. Instant cache check: if cached, render immediately (0ms)!
      const activeCacheKey = `${accountIndex}_${folder.id}`;
      const cached = clientFolderCache.get(activeCacheKey);
      const isFresh =
        cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

      setCurrentFolderId(folder.id);

      if (isFresh) {
        setFiles(cached.files);
        setIsLoading(false);
      } else {
        setFiles([]);
        setIsLoading(true);
        fetchFiles(folder.id);
      }
    },
    [accountIndex, breadcrumbs, fetchFiles]
  );

  // Instant optimistic file navigation: immediately renders FileDetailSkeleton in 0ms!
  const handleFileClick = useCallback(
    (file: DriveFile) => {
      setNavigatingFileId(file.id);

      const parentId =
        breadcrumbs?.[breadcrumbs.length - 1]?.id || "root";

      if (typeof window !== "undefined") {
        sessionStorage.setItem("drive_navigating_id", file.id);
        sessionStorage.setItem("drive_navigating_type", "file");
        sessionStorage.setItem(`drive_type_${file.id}`, "file");
        sessionStorage.setItem(`drive_parent_${file.id}`, parentId);
        sessionStorage.setItem(
          `drive_breadcrumbs_${file.id}`,
          JSON.stringify(breadcrumbs || [{ id: "root", name: "My Drive" }])
        );
      }

      router.push(`/${accountIndex}/file/${file.id}`);
    },
    [accountIndex, breadcrumbs, router]
  );

  // Navigate using breadcrumb instantly
  const handleBreadcrumbNavigate = useCallback(
    (folderId: string, index: number) => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("drive_navigating_id", folderId);
        sessionStorage.setItem("drive_navigating_type", "folder");
        sessionStorage.setItem(`drive_type_${folderId}`, "folder");
      }

      setSearchQuery("");

      if (folderId === "root") {
        const rootTrail: BreadcrumbItem[] = [{ id: "root", name: "My Drive" }];
        setBreadcrumbs(rootTrail);
        saveBreadcrumbsForFolder("root", rootTrail);
        window.history.pushState({ folderId: "root", accountIndex }, "", `/${accountIndex}`);

        const activeCacheKey = `${accountIndex}_root`;
        const cached = clientFolderCache.get(activeCacheKey);
        const isFresh =
          cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

        setCurrentFolderId("root");
        if (isFresh) {
          setFiles(cached.files);
          setIsLoading(false);
        } else {
          setFiles([]);
          setIsLoading(true);
          fetchFiles("root");
        }
      } else {
        const sliced = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(sliced);
        saveBreadcrumbsForFolder(folderId, sliced);
        window.history.pushState(
          { folderId, accountIndex },
          "",
          `/${accountIndex}/${folderId}?type=folder`
        );

        const activeCacheKey = `${accountIndex}_${folderId}`;
        const cached = clientFolderCache.get(activeCacheKey);
        const isFresh =
          cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

        setCurrentFolderId(folderId);
        if (isFresh) {
          setFiles(cached.files);
          setIsLoading(false);
        } else {
          setFiles([]);
          setIsLoading(true);
          fetchFiles(folderId);
        }
      }
    },
    [accountIndex, breadcrumbs, fetchFiles]
  );

  // Handle browser Back / Forward buttons without full page reloads
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      setNavigatingFileId(null);
      const locParts = window.location.pathname.split("/").filter(Boolean);
      const accIdx = locParts[0] ? parseInt(locParts[0], 10) || 0 : 0;
      if (accIdx !== accountIndex) {
        return;
      }
      const targetFolderId = locParts[1] ? decodeURIComponent(locParts[1]) : "root";
      const cachedType = sessionStorage.getItem(`drive_type_${targetFolderId}`);
      if (cachedType === "file") {
        window.location.reload();
        return;
      }

      const trail = getStoredBreadcrumbs(targetFolderId);
      setBreadcrumbs(trail);
      setSearchQuery("");

      const activeCacheKey = `${accountIndex}_${targetFolderId}`;
      const cached = clientFolderCache.get(activeCacheKey);
      const isFresh =
        cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS;

      setCurrentFolderId(targetFolderId);
      if (isFresh) {
        setFiles(cached.files);
        setIsLoading(false);
      } else {
        setFiles([]);
        setIsLoading(true);
        fetchFiles(targetFolderId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [accountIndex, fetchFiles]);

  // Instantly reset to Root Drive when user clicks LeviDrive logo in header
  useEffect(() => {
    const handleNavigateRoot = () => {
      handleBreadcrumbNavigate("root", 0);
    };
    window.addEventListener("levidrive_navigate_root", handleNavigateRoot);
    return () => {
      window.removeEventListener("levidrive_navigate_root", handleNavigateRoot);
    };
  }, [handleBreadcrumbNavigate]);

  // Idle prefetching: automatically prefetch immediate subfolders when idle
  useEffect(() => {
    if (!files || files.length === 0 || isLoading) return;

    const subfolders = files
      .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
      .slice(0, 4);

    if (subfolders.length === 0) return;

    const idleTimer = setTimeout(() => {
      subfolders.forEach((subfolder) => {
        prefetchFolder(subfolder.id);
      });
    }, 500);

    return () => clearTimeout(idleTimer);
  }, [files, isLoading, prefetchFolder]);

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

  if (navigatingFileId) {
    return (
      <div className="w-full">
        <FileDetailSkeleton
          accountIndex={accountIndex}
          driveId={navigatingFileId}
        />
      </div>
    );
  }

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
          isLoading={isLoading || isSearching}
          isMockData={isMockData}
        />

        {/* Global Search Results Indicator */}
        {isGlobalSearchActive && Boolean(searchQuery.trim()) && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                Pencarian di seluruh Google Drive untuk:{" "}
                <strong className="font-semibold text-blue-950">&quot;{searchQuery.trim()}&quot;</strong>
                {isSearching ? (
                  <span className="text-blue-500 italic ml-1">mencari...</span>
                ) : (
                  <span className="text-blue-700 ml-1">({filteredFiles.length} item ditemukan)</span>
                )}
              </span>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer hover:underline"
            >
              Reset
            </button>
          </div>
        )}

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
          /* Headless TanStack Table View with Instant Folder Navigation */
          <DriveTable
            data={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            searchQuery={searchQuery}
            isFiltered={isFiltered}
            hasNoAccount={hasNoAccount}
            currentBreadcrumbs={breadcrumbs}
            onFolderClick={handleFolderClick}
            onFileClick={handleFileClick}
            onPrefetchFolder={prefetchFolder}
          />
        ) : (
          /* Visual Grid View with Instant Folder Navigation */
          <DriveGrid
            files={hasNoAccount ? [] : filteredFiles}
            accountIndex={accountIndex}
            searchQuery={searchQuery}
            isFiltered={isFiltered}
            hasNoAccount={hasNoAccount}
            currentBreadcrumbs={breadcrumbs}
            onFolderClick={handleFolderClick}
            onFileClick={handleFileClick}
            onPrefetchFolder={prefetchFolder}
          />
        )}
      </div>
    </div>
  );
}
