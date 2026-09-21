import React from "react";
import {
  Folder,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  File,
} from "lucide-react";
import { getFileCategory } from "@/lib/utils";

interface FileTypeIconProps {
  mimeType: string;
  fileName?: string;
  className?: string;
  size?: number;
}

export function FileTypeIcon({
  mimeType,
  fileName,
  className = "h-5 w-5",
  size = 20,
}: FileTypeIconProps) {
  const category = getFileCategory(mimeType, fileName);

  switch (category) {
    case "folder":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-200/50">
          <Folder size={size} className={className} fill="currentColor" fillOpacity={0.2} />
        </div>
      );
    case "document":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-200/50">
          <FileText size={size} className={className} />
        </div>
      );
    case "spreadsheet":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50">
          <FileSpreadsheet size={size} className={className} />
        </div>
      );
    case "presentation":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-200/50">
          <Presentation size={size} className={className} />
        </div>
      );
    case "pdf":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-200/50">
          <FileText size={size} className={className} />
        </div>
      );
    case "image":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 ring-1 ring-purple-200/50">
          <ImageIcon size={size} className={className} />
        </div>
      );
    case "video":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50">
          <Video size={size} className={className} />
        </div>
      );
    case "audio":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200/50">
          <Music size={size} className={className} />
        </div>
      );
    case "archive":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
          <FileArchive size={size} className={className} />
        </div>
      );
    case "code":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/50">
          <FileCode size={size} className={className} />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
          <File size={size} className={className} />
        </div>
      );
  }
}
