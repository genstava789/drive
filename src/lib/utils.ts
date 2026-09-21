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

export function getFileCategory(mimeType: string, fileName?: string): string {
  const mime = (mimeType || "").toLowerCase();
  const ext = fileName ? fileName.split(".").pop()?.toLowerCase() || "" : "";

  if (mime === "application/vnd.google-apps.folder") return "folder";

  // Check spreadsheet first (before document, because OpenXML .xlsx has 'officedocument' in its MIME type)
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime === "application/vnd.google-apps.spreadsheet" ||
    mime === "text/csv" ||
    mime.includes("spreadsheet") ||
    ["xlsx", "xls", "csv", "tsv", "ods"].includes(ext)
  ) {
    return "spreadsheet";
  }

  // Check presentation second (before document, because OpenXML .pptx has 'officedocument' in its MIME type)
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    mime === "application/vnd.google-apps.presentation" ||
    ["pptx", "ppt", "odp", "key"].includes(ext)
  ) {
    return "presentation";
  }

  // Check document
  if (
    mime.includes("word") ||
    mime.includes("wordprocessingml") ||
    mime === "application/vnd.google-apps.document" ||
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime.includes("rtf") ||
    mime.includes("document") ||
    ["doc", "docx", "txt", "md", "rtf", "odt"].includes(ext)
  ) {
    return "document";
  }

  // PDF
  if (mime.includes("pdf") || ext === "pdf") return "pdf";

  // Images
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "heic"].includes(ext)
  ) {
    return "image";
  }

  // Videos
  if (
    mime.startsWith("video/") ||
    ["mp4", "mkv", "mov", "avi", "webm", "wmv", "flv", "m4v"].includes(ext)
  ) {
    return "video";
  }

  // Audio
  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma"].includes(ext)
  ) {
    return "audio";
  }

  // Archives / Compressed
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("compressed") ||
    mime.includes("gzip") ||
    ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"].includes(ext)
  ) {
    return "archive";
  }

  // Code / Source files
  if (
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("html") ||
    mime.includes("css") ||
    ["js", "ts", "jsx", "tsx", "json", "html", "css", "py", "sh", "sql", "xml", "yaml", "yml"].includes(ext)
  ) {
    return "code";
  }

  return "file";
}

/**
 * Generate download URL pointing to Cloudflare Worker (if configured),
 * or fallback to direct Google Drive export download URL.
 */
export function getDownloadUrl(fileId: string, fileName?: string): string {
  const workerBaseUrl = process.env.NEXT_PUBLIC_CF_WORKER_URL?.replace(/\/+$/, "");

  if (workerBaseUrl) {
    const params = new URLSearchParams({ id: fileId });
    if (fileName) {
      params.set("name", fileName);
    }
    return `${workerBaseUrl}/download?${params.toString()}`;
  }

  // Safe fallback to direct Google Drive download URL
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}
