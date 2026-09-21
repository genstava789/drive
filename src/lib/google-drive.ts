import { DriveFile, DriveResponse } from "@/types/drive";
import { MOCK_ROOT_FILES, MOCK_SUBFOLDER_FILES } from "./mock-data";

export async function getDriveFiles(
  accessToken?: string | null,
  folderId = "root",
  forceMock = false
): Promise<DriveResponse> {
  // If no access token is available or forceMock is requested, return mock data
  if (!accessToken || forceMock) {
    const files =
      folderId === "root"
        ? MOCK_ROOT_FILES
        : MOCK_SUBFOLDER_FILES[folderId] || [];

    return {
      files,
      currentFolderId: folderId,
      isMockData: true,
      storageQuota: {
        limit: "16106127360", // 15 GB
        usage: "5826000000", // ~5.42 GB
        usageInDrive: "4100000000",
        usageInDriveTrash: "120000000",
      },
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

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn("Google Drive API error:", response.status, errBody);
      // If token expired or unauthorized, return mock data with warning
      return {
        files: folderId === "root" ? MOCK_ROOT_FILES : MOCK_SUBFOLDER_FILES[folderId] || [],
        currentFolderId: folderId,
        isMockData: true,
      };
    }

    const data = await response.json();

    // Map Google API response to clean DriveFile format
    const files: DriveFile[] = (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : undefined,
      modifiedTime: file.modifiedTime || new Date().toISOString(),
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
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
    };
  } catch (error) {
    console.error("Error fetching Google Drive files:", error);
    return {
      files: folderId === "root" ? MOCK_ROOT_FILES : MOCK_SUBFOLDER_FILES[folderId] || [],
      currentFolderId: folderId,
      isMockData: true,
    };
  }
}
