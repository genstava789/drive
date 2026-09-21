import { DriveFile, DriveResponse } from "@/types/drive";

import {
  getValidAccessTokenForAccount,
  getServerAccounts,
} from "./server-account-store";

export async function getDriveFiles(
  accessToken?: string | null,
  folderId = "root",
  accountIndex = 0,
  forceMock = false
): Promise<DriveResponse> {
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
    };
  }

  try {
    const parentQuery = `'${folderId}' in parents and trashed = false`;
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
      next: { revalidate: 15 },
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
          next: { revalidate: 15 },
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

    return {
      files,
      nextPageToken: data.nextPageToken,
      currentFolderId: folderId,
      isMockData: false,
      accountIndex,
    };
  } catch (error) {
    console.error("Error fetching Google Drive files:", error);
    return {
      files: [],
      currentFolderId: folderId,
      isMockData: false,
      accountIndex,
      accounts: [],
    };
  }
}

export async function getDriveItemById(
  id: string,
  accessToken?: string | null,
  accountIndex = 0
): Promise<DriveFile | null> {
  if (!id) return null;

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
        next: { revalidate: 30 },
      });

      if (response.status === 401) {
        const refreshed = await getValidAccessTokenForAccount(accountIndex);
        if (refreshed && refreshed !== effectiveToken) {
          effectiveToken = refreshed;
          response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
            },
            next: { revalidate: 30 },
          });
        }
      }

      if (response.ok) {
        const file = await response.json();
        return {
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
      }
    } catch (e) {
      console.warn("Failed to fetch item from Drive API:", e);
    }
  }

  return null;
}
