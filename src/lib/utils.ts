import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number, decimals = 1): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "—";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)} ${sizes[sizes.length - 1]}`;

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getFileCategory(mimeType: string): string {
  if (!mimeType) return "other";
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown"
  ) {
    return "document";
  }
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    mimeType === "application/vnd.google-apps.presentation"
  ) {
    return "presentation";
  }
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("compressed")
  ) {
    return "archive";
  }
  if (
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  ) {
    return "code";
  }
  return "file";
}
