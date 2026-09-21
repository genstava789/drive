export interface DriveOwner {
  displayName: string;
  emailAddress?: string;
  photoLink?: string;
  me?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number; // Size in bytes
  modifiedTime: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  shared?: boolean;
  owners?: DriveOwner[];
  parents?: string[];
  description?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  image?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface DriveResponse {
  files: DriveFile[];
  nextPageToken?: string;
  currentFolderId: string;
  currentFolderName?: string;
  isMockData?: boolean;
  accountIndex?: number;
  accounts?: GoogleAccount[];
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export type FileCategoryFilter =
  | "all"
  | "folder"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "image"
  | "media"
  | "archive";
