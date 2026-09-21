import { BreadcrumbItem } from "@/types/drive";

const inMemoryBreadcrumbs = new Map<string, BreadcrumbItem[]>();

/**
 * Retrieve the breadcrumb trail for a folder.
 * Prioritizes in-memory and sessionStorage caches.
 */
export function getStoredBreadcrumbs(folderId: string, fallbackName?: string): BreadcrumbItem[] {
  if (!folderId || folderId === "root") {
    return [{ id: "root", name: "My Drive" }];
  }

  // 1. Check in-memory map
  if (inMemoryBreadcrumbs.has(folderId)) {
    const mem = inMemoryBreadcrumbs.get(folderId)!;
    if (Array.isArray(mem) && mem.length > 0) {
      return mem.map((b) => ({ ...b }));
    }
  }

  // 2. Check sessionStorage
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`drive_breadcrumbs_${folderId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryBreadcrumbs.set(folderId, parsed);
          return [...parsed];
        }
      }

      // Check if parent chain is known
      const parentId = sessionStorage.getItem(`drive_parent_${folderId}`);
      const folderName = fallbackName || sessionStorage.getItem(`drive_folder_name_${folderId}`) || "Folder";
      if (parentId && parentId !== folderId) {
        const parentTrail = getStoredBreadcrumbs(parentId);
        const trail = appendBreadcrumb(parentTrail, { id: folderId, name: folderName });
        saveBreadcrumbsForFolder(folderId, trail);
        return trail;
      }

      // Fallback single parent
      const singleName = fallbackName || sessionStorage.getItem(`drive_folder_name_${folderId}`) || "Folder";
      return [
        { id: "root", name: "My Drive" },
        { id: folderId, name: singleName },
      ];
    } catch (_) {}
  }

  return [
    { id: "root", name: "My Drive" },
    { id: folderId, name: fallbackName || "Folder" },
  ];
}

/**
 * Save breadcrumbs trail for a specific folder
 */
export function saveBreadcrumbsForFolder(folderId: string, breadcrumbs: BreadcrumbItem[]): void {
  if (!folderId) return;

  inMemoryBreadcrumbs.set(folderId, breadcrumbs);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`drive_breadcrumbs_${folderId}`, JSON.stringify(breadcrumbs));
      if (breadcrumbs.length > 0) {
        const currentItem = breadcrumbs[breadcrumbs.length - 1];
        sessionStorage.setItem(`drive_folder_name_${folderId}`, currentItem.name);
      }
    } catch (_) {}
  }
}

/**
 * Append a folder to a breadcrumb trail without duplicating
 */
export function appendBreadcrumb(
  trail: BreadcrumbItem[],
  folder: { id: string; name: string }
): BreadcrumbItem[] {
  const existingIndex = trail.findIndex((item) => item.id === folder.id);
  if (existingIndex !== -1) {
    // If it already exists in the chain, slice to it (avoid looping)
    const updated = trail.slice(0, existingIndex + 1);
    updated[existingIndex] = { id: folder.id, name: folder.name || updated[existingIndex].name };
    return updated;
  }

  return [...trail, { id: folder.id, name: folder.name || "Folder" }];
}

/**
 * Record a folder navigation step: updates breadcrumbs, parent pointer, type, and name
 */
export function recordFolderNavigation(
  currentBreadcrumbs: BreadcrumbItem[],
  targetFolder: { id: string; name: string }
): BreadcrumbItem[] {
  const newTrail = appendBreadcrumb(currentBreadcrumbs, targetFolder);
  saveBreadcrumbsForFolder(targetFolder.id, newTrail);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`drive_type_${targetFolder.id}`, "folder");
      sessionStorage.setItem(`drive_folder_name_${targetFolder.id}`, targetFolder.name);
      const parentId = currentBreadcrumbs[currentBreadcrumbs.length - 1]?.id || "root";
      sessionStorage.setItem(`drive_parent_${targetFolder.id}`, parentId);
    } catch (_) {}
  }

  return newTrail;
}
