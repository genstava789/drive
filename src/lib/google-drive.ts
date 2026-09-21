import { DriveFile, DriveResponse } from "@/types/drive";

import {
  getValidAccessTokenForAccount,
  getServerStoreState,
} from "./server-account-store";

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

export async function getDriveFiles(
  accessToken?: string | null,
  folderId = "root",
  accountIndex = 0,
  forceMock = false,
  query?: string
): Promise<DriveResponse> {
  const sanitizedQuery = (query || "").trim().replace(/['\\]/g, "");
  const cacheKey = sanitizedQuery
    ? `${accountIndex}:search:${sanitizedQuery.toLowerCase()}`
    : `${accountIndex}:${folderId}`;
  if (!forceMock) {
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

  // Check if we can use server-stored valid token if none provided in browser session
  let effectiveToken = accessToken;
  if (!effectiveToken && !forceMock) {
    try {
      effectiveToken = await getValidAccessTokenForAccount(accountIndex);
    } catch (_) {}
  }

  // If still no access token is available, return empty data (no demo accounts)
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
    const parentQuery = sanitizedQuery
      ? `name contains '${sanitizedQuery}' and trashed = false`
      : `'${folderId}' in parents and trashed = false`;
    const fields =
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, shared, owners, parents, description)";
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
    const files: DriveFile[] = (data.files || []).map((file: any) => ({
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
    }));

    // Pre-populate individual item cache so any subsequent click on a file or folder
    // resolves instantaneously in 0.1ms without calling the Google Drive API again!
    for (const item of files) {
      const itemKey = `${accountIndex}:${item.id}`;
      driveItemCache.set(itemKey, { data: item, timestamp: Date.now() });
    }

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

  let effectiveToken = accessToken;
  if (!effectiveToken) {
    try {
      effectiveToken = await getValidAccessTokenForAccount(accountIndex);
    } catch (_) {}
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
        return itemResult;
      }
    } catch (e) {
      console.warn("Failed to fetch item from Drive API:", e);
    }
  }

  return null;
}
