import { DriveFile, DriveResponse, BreadcrumbItem } from "@/types/drive";

import {
  getValidAccessTokenForAccount,
  getServerStoreState,
} from "./server-account-store";
import {
  getCachedFolderFilesFromSupabase,
  getCachedItemByIdFromSupabase,
  upsertFilesToSupabaseCache,
  removeFilesFromSupabaseCache,
  getDriveSyncToken,
  saveDriveSyncToken,
} from "./supabase";

// Server-side in-memory cache for ultra-fast folder and item lookups
interface CachedDriveResult {
  data: DriveResponse;
  timestamp: number;
}
const driveFolderCache = new Map<string, CachedDriveResult>();
const FOLDER_CACHE_TTL_MS = 30000; // 30 seconds folder cache

interface CachedItemResult {
  data: DriveFile;
  timestamp: number;
}
const driveItemCache = new Map<string, CachedItemResult>();
const ITEM_CACHE_TTL_MS = 60000; // 60 seconds file detail cache

export function clearServerDriveCache(): void {
  driveFolderCache.clear();
  driveItemCache.clear();
}

function resolveAccountId(serverState: any, accountIndex: number): string {
  const acc = serverState?.accounts?.[accountIndex];
  return acc?.id || acc?.email || `acc_${accountIndex}`;
}

export async function getDriveFiles(
  accessToken?: string | null,
  folderId = "root",
  accountIndex = 0,
  forceRefresh = false,
  query?: string
): Promise<DriveResponse> {
  const sanitizedQuery = (query || "").trim().replace(/['\\]/g, "");
  const cacheKey = sanitizedQuery
    ? `${accountIndex}:search:${sanitizedQuery.toLowerCase()}`
    : `${accountIndex}:${folderId}`;

  // 1. In-Memory Fast Cache Check
  if (!forceRefresh) {
    const cached = driveFolderCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FOLDER_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const serverState = await getServerStoreState();
  if (serverState.loggedOut || !serverState.accounts || serverState.accounts.length === 0) {
    return {
      files: [],
      currentFolderId: folderId,
      currentFolderName: "My Drive",
      isMockData: false,
      accountIndex,
      accounts: [],
      isAuthenticated: false,
    };
  }

  const accountId = resolveAccountId(serverState, accountIndex);

  // 2. Supabase PostgreSQL Cache / Indexing Layer Check (<20ms latency)
  if (!forceRefresh) {
    try {
      const supabaseCached = await getCachedFolderFilesFromSupabase(
        accountId,
        folderId,
        sanitizedQuery
      );

      if (supabaseCached && supabaseCached.length > 0) {
        // Pre-populate in-memory item cache for instant file clicks
        for (const item of supabaseCached) {
          driveItemCache.set(`${accountIndex}:${item.id}`, {
            data: item,
            timestamp: Date.now(),
          });
        }

        const result: DriveResponse = {
          files: supabaseCached,
          currentFolderId: folderId,
          currentFolderName: sanitizedQuery ? `Pencarian: "${sanitizedQuery}"` : undefined,
          isMockData: false,
          accountIndex,
          isAuthenticated: true,
        };

        driveFolderCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err) {
      console.warn("[GoogleDrive] Supabase cache lookup skipped:", err);
    }
  }

  // 3. Fallback to Google Drive API with trimmed fields
  let effectiveToken = accessToken;
  if (!effectiveToken) {
    try {
      effectiveToken = await getValidAccessTokenForAccount(accountIndex);
    } catch (_) { }
  }

  if (!effectiveToken) {
    return {
      files: [],
      currentFolderId: folderId,
      currentFolderName: "My Drive",
      isMockData: false,
      accountIndex,
      accounts: [],
      isAuthenticated: false,
    };
  }

  try {
    const effectiveFolderId =
      folderId === "0AAgz7sm0L0i1Uk9PVA" ? "root" : folderId;
    const parentQuery = sanitizedQuery
      ? `name contains '${sanitizedQuery}' and trashed = false`
      : `'${effectiveFolderId}' in parents and trashed = false`;

    // Pruned fields to minimize JSON payload size and transfer time
    const fields =
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, thumbnailLink, shared, parents)";
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", parentQuery);
    url.searchParams.set("fields", fields);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("orderBy", "folder,name");

    let response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
      },
      cache: "no-store",
    });

    // Auto-retry once with refreshed token if 401 Unauthorized
    if (response.status === 401) {
      console.warn("[GoogleDrive] 401 Unauthorized encountered, attempting token refresh...");
      const refreshedToken = await getValidAccessTokenForAccount(accountIndex);
      if (refreshedToken && refreshedToken !== effectiveToken) {
        effectiveToken = refreshedToken;
        response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
          cache: "no-store",
        });
      }
    }

    if (!response.ok) {
      const errBody = await response.text();
      console.warn("Google Drive API error:", response.status, errBody);

      return {
        files: [],
        currentFolderId: folderId,
        currentFolderName: "My Drive",
        isMockData: false,
        accountIndex,
        accounts: [],
        isAuthenticated: false,
      };
    }

    const data = await response.json();
    const rawFiles: any[] = data.files || [];
    const files: DriveFile[] = rawFiles
      .filter(
        (file: any) =>
          !(
            file.name?.toLowerCase() === "my drive" &&
            file.mimeType === "application/vnd.google-apps.folder"
          ) && file.id !== "0AAgz7sm0L0i1Uk9PVA"
      )
      .map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size, 10) : undefined,
        modifiedTime: file.modifiedTime || new Date().toISOString(),
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        webContentLink:
          file.webContentLink ||
          `https://drive.google.com/uc?export=download&id=${file.id}`,
        thumbnailLink: file.thumbnailLink,
        shared: file.shared || false,
        parents: file.parents || [folderId],
      }));

    // Pre-populate individual item cache so subsequent clicks resolve in 0.1ms
    for (const item of files) {
      const itemKey = `${accountIndex}:${item.id}`;
      driveItemCache.set(itemKey, { data: item, timestamp: Date.now() });
    }

    // Persist to Supabase cache in the background (fire-and-forget for maximum speed)
    upsertFilesToSupabaseCache(accountId, files, folderId).catch((e) =>
      console.warn("[GoogleDrive] Background Supabase cache upsert error:", e)
    );

    const result: DriveResponse = {
      files,
      nextPageToken: data.nextPageToken,
      currentFolderId: folderId,
      currentFolderName: sanitizedQuery ? `Pencarian: "${sanitizedQuery}"` : undefined,
      isMockData: false,
      accountIndex,
      isAuthenticated: true,
    };
    driveFolderCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Error fetching Google Drive files:", error);
    return {
      files: [],
      currentFolderId: folderId,
      isMockData: false,
      accountIndex,
      accounts: [],
      isAuthenticated: false,
    };
  }
}

export async function getDriveItemById(
  id: string,
  accessToken?: string | null,
  accountIndex = 0,
  forceRefresh = false
): Promise<DriveFile | null> {
  if (!id) return null;

  const itemCacheKey = `${accountIndex}:${id}`;
  if (!forceRefresh) {
    const cached = driveItemCache.get(itemCacheKey);
    if (cached && Date.now() - cached.timestamp < ITEM_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // 1. Check Supabase Cache Layer
  if (!forceRefresh) {
    try {
      const serverState = await getServerStoreState();
      const accountId = resolveAccountId(serverState, accountIndex);
      const supabaseItem = await getCachedItemByIdFromSupabase(accountId, id);
      if (supabaseItem) {
        driveItemCache.set(itemCacheKey, { data: supabaseItem, timestamp: Date.now() });
        return supabaseItem;
      }
    } catch (_) { }
  }

  let effectiveToken = accessToken;
  if (!effectiveToken) {
    try {
      effectiveToken = await getValidAccessTokenForAccount(accountIndex);
    } catch (_) { }
  }

  // Real Google Drive API lookup
  if (effectiveToken) {
    try {
      const fields =
        "id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, shared, owners, parents, description";
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`;
      let response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        const refreshed = await getValidAccessTokenForAccount(accountIndex);
        if (refreshed && refreshed !== effectiveToken) {
          effectiveToken = refreshed;
          response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
            },
            cache: "no-store",
          });
        }
      }

      if (response.ok) {
        const file = await response.json();
        const itemResult: DriveFile = {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size, 10) : undefined,
          modifiedTime: file.modifiedTime || new Date().toISOString(),
          createdTime: file.createdTime,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`,
          iconLink: file.iconLink,
          thumbnailLink: file.thumbnailLink,
          shared: file.shared || false,
          owners: file.owners?.map((owner: any) => ({
            displayName: owner.displayName,
            emailAddress: owner.emailAddress,
            photoLink: owner.photoLink,
            me: owner.me,
          })),
          parents: file.parents,
          description: file.description,
        };
        driveItemCache.set(itemCacheKey, { data: itemResult, timestamp: Date.now() });

        // Save to Supabase cache in the background
        getServerStoreState().then((serverState) => {
          const accountId = resolveAccountId(serverState, accountIndex);
          upsertFilesToSupabaseCache(accountId, [itemResult]).catch(() => { });
        });

        return itemResult;
      }
    } catch (e) {
      console.warn("Failed to fetch item from Drive API:", e);
    }
  }

  return null;
}

/**
 * Incrementally synchronize changes from Google Drive via changes.list() API
 * into Supabase files_cache.
 */
export async function syncDriveChangesForAccount(accountIndex = 0): Promise<{
  success: boolean;
  changesCount: number;
  updatedCount: number;
  removedCount: number;
  newStartPageToken?: string;
  message?: string;
}> {
  const serverState = await getServerStoreState();
  const accountId = resolveAccountId(serverState, accountIndex);

  let token = await getValidAccessTokenForAccount(accountIndex);
  if (!token) {
    return {
      success: false,
      changesCount: 0,
      updatedCount: 0,
      removedCount: 0,
      message: "Tidak ada token akses valid untuk akun ini",
    };
  }

  try {
    let pageToken = await getDriveSyncToken(accountId);

    // If no start_page_token yet, fetch one from Google Drive API
    if (!pageToken) {
      const tokenRes = await fetch(
        "https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        pageToken = tokenData.startPageToken;
        if (pageToken) {
          await saveDriveSyncToken(accountId, pageToken);
        }
      }

      // Pre-seed files_cache by fetching root items
      const initialRoot = await getDriveFiles(token, "root", accountIndex, true);
      return {
        success: true,
        changesCount: initialRoot.files.length,
        updatedCount: initialRoot.files.length,
        removedCount: 0,
        newStartPageToken: pageToken || undefined,
        message: "Inisialisasi token sinkronisasi dan cache awal berhasil",
      };
    }

    // Call changes.list incrementally
    let currentToken: string | null = pageToken;
    let totalChanges = 0;
    let updatedCount = 0;
    let removedCount = 0;
    const toUpsert: DriveFile[] = [];
    const toRemove: string[] = [];
    let newStartToken: string | undefined;

    // Fetch changes pages (cap at 5 pages per sync run to prevent timeouts)
    let pageCount = 0;
    while (currentToken && pageCount < 5) {
      pageCount++;
      const fields =
        "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,shared,parents,trashed))";
      const changeUrl: string = `https://www.googleapis.com/drive/v3/changes?pageToken=${encodeURIComponent(
        currentToken
      )}&fields=${encodeURIComponent(
        fields
      )}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100`;

      const changeRes: Response = await fetch(changeUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!changeRes.ok) {
        // If token is expired or invalid (HTTP 400/404/410), reset startPageToken
        if (changeRes.status === 400 || changeRes.status === 404 || changeRes.status === 410) {
          console.warn("[DriveSync] StartPageToken expired or invalid, re-initializing...");
          const tokenRes = await fetch(
            "https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (tokenRes.ok) {
            const tokenData: any = await tokenRes.json();
            if (tokenData.startPageToken) {
              await saveDriveSyncToken(accountId, tokenData.startPageToken);
            }
          }
        }
        break;
      }

      const changeData: any = await changeRes.json();
      const changes = changeData.changes || [];
      totalChanges += changes.length;

      for (const ch of changes) {
        if (ch.removed || ch.file?.trashed) {
          toRemove.push(ch.fileId);
          removedCount++;
        } else if (ch.file && ch.file.name) {
          // Never upsert the drive root itself as a child item
          if (
            (ch.file.name?.toLowerCase() === "my drive" &&
              ch.file.mimeType === "application/vnd.google-apps.folder") ||
            ch.fileId === "0AAgz7sm0L0i1Uk9PVA"
          ) {
            continue;
          }

          const rawParents: string[] = ch.file.parents || [];
          const normalizedParents = rawParents.map((p: string) =>
            p === "0AAgz7sm0L0i1Uk9PVA" ? "root" : p
          );
          if (normalizedParents.length === 0) {
            normalizedParents.push("root");
          }

          toUpsert.push({
            id: ch.file.id,
            name: ch.file.name,
            mimeType: ch.file.mimeType,
            size: ch.file.size ? parseInt(ch.file.size, 10) : undefined,
            modifiedTime: ch.file.modifiedTime || new Date().toISOString(),
            createdTime: ch.file.createdTime,
            thumbnailLink: ch.file.thumbnailLink,
            shared: ch.file.shared || false,
            parents: normalizedParents,
          });
          updatedCount++;
        }
      }

      if (changeData.newStartPageToken) {
        newStartToken = changeData.newStartPageToken;
        currentToken = null;
      } else {
        currentToken = changeData.nextPageToken || null;
      }
    }

    if (toUpsert.length > 0) {
      await upsertFilesToSupabaseCache(accountId, toUpsert);
      driveFolderCache.clear();
      driveItemCache.clear();
    }

    if (toRemove.length > 0) {
      await removeFilesFromSupabaseCache(accountId, toRemove);
      driveFolderCache.clear();
      driveItemCache.clear();
    }

    if (newStartToken) {
      await saveDriveSyncToken(accountId, newStartToken);
    }

    return {
      success: true,
      changesCount: totalChanges,
      updatedCount,
      removedCount,
      newStartPageToken: newStartToken,
      message: `Sinkronisasi berhasil: ${totalChanges} perubahan diproses`,
    };
  } catch (err: any) {
    console.error("[DriveSync] Error during changes sync:", err);
    return {
      success: false,
      changesCount: 0,
      updatedCount: 0,
      removedCount: 0,
      message: err.message || "Gagal menyinkronkan perubahan Drive",
    };
  }
}

/**
 * Recursively resolves the full breadcrumb ancestry chain for a folder from Google Drive API.
 * Uses the in-memory item cache for sub-millisecond execution.
 */
export async function getFolderBreadcrumbs(
  folderId: string,
  accessToken?: string | null,
  accountIndex = 0
): Promise<BreadcrumbItem[]> {
  if (!folderId || folderId === "root" || folderId === "0AAgz7sm0L0i1Uk9PVA") {
    return [{ id: "root", name: "My Drive" }];
  }

  const chain: BreadcrumbItem[] = [];
  let currentId: string | undefined = folderId;
  let depth = 0;

  while (
    currentId &&
    currentId !== "root" &&
    currentId !== "0AAgz7sm0L0i1Uk9PVA" &&
    depth < 6
  ) {
    const item = await getDriveItemById(currentId, accessToken, accountIndex);
    if (!item) break;

    // Stop if this is the Drive Root itself (e.g. named "My Drive" or has no parents)
    if (
      item.id === "0AAgz7sm0L0i1Uk9PVA" ||
      item.name.toLowerCase() === "my drive" ||
      !item.parents ||
      item.parents.length === 0
    ) {
      break;
    }

    chain.unshift({ id: item.id, name: item.name });
    currentId = item.parents?.[0];
    depth++;
  }

  chain.unshift({ id: "root", name: "My Drive" });
  return chain;
}

