"use client";

import React, { useState } from "react";
import { DriveFile } from "@/types/drive";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileTypeIcon } from "./file-type-icon";
import { formatBytes, formatDate, getFileCategory } from "@/lib/utils";
import {
  ExternalLink,
  Copy,
  Check,
  Calendar,
  HardDrive,
  User,
  Users,
  Info,
  Download,
} from "lucide-react";

interface FilePreviewModalProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const category = getFileCategory(file.mimeType);
  const isFolder = category === "folder";

  const handleCopyLink = () => {
    if (file.webViewLink) {
      navigator.clipboard.writeText(file.webViewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <FileTypeIcon mimeType={file.mimeType} size={24} />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <DialogTitle className="text-base sm:text-lg font-semibold text-slate-900 break-words leading-snug">
                {file.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[11px] font-medium">
                  {file.mimeType}
                </Badge>
                {file.shared && (
                  <Badge variant="info" className="text-[11px]">
                    Dibagikan
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Thumbnail Preview for Images if available */}
        {category === "image" && file.thumbnailLink && (
          <div className="w-full flex items-center justify-center bg-slate-50 rounded-lg p-2 border border-slate-100 max-h-52 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.thumbnailLink}
              alt={file.name}
              className="max-h-48 object-contain rounded"
            />
          </div>
        )}

        {/* File Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-[#F8F9FA] p-2.5">
            <HardDrive className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Ukuran Berkas
              </p>
              <p className="font-semibold text-slate-800">
                {isFolder ? "Direktori Folder" : formatBytes(file.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-[#F8F9FA] p-2.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Terakhir Diubah
              </p>
              <p className="font-semibold text-slate-800">
                {formatDate(file.modifiedTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-[#F8F9FA] p-2.5">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Pemilik (Owner)
              </p>
              <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                {file.owners && file.owners.length > 0
                  ? file.owners[0].displayName
                  : "Saya"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-[#F8F9FA] p-2.5">
            <Users className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Status Berbagi
              </p>
              <p className="font-semibold text-slate-800">
                {file.shared ? "Dibagikan dengan pihak lain" : "Hanya Anda"}
              </p>
            </div>
          </div>
        </div>

        {/* Link / URL Row */}
        {file.webViewLink && (
          <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <Info className="h-3.5 w-3.5" /> URL Google Drive
              </span>
              <button
                onClick={handleCopyLink}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Salin Link
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-600 truncate">
              {file.webViewLink}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {file.webContentLink && (
            <a
              href={file.webContentLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Unduh Langsung
              </Button>
            </a>
          )}
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-3.5 w-3.5" /> Buka di Google Drive
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
