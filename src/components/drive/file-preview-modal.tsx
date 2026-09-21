"use client";

import React from "react";
import { DriveFile } from "@/types/drive";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "./file-type-icon";
import { formatBytes, formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

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
  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="shrink-0">
              <FileTypeIcon mimeType={file.mimeType} size={22} />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 truncate min-w-0 flex-1" title={file.name}>
              {file.name}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-2 text-xs text-slate-600 py-2">
          <p>
            <strong>Ukuran:</strong> {formatBytes(file.size)}
          </p>
          <p>
            <strong>Diubah:</strong> {formatDate(file.modifiedTime)}
          </p>
        </div>
        <div className="flex justify-end pt-2">
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noreferrer">
              <Button size="sm" className="text-xs gap-1.5 bg-blue-600">
                <ExternalLink className="h-3.5 w-3.5" /> Buka di Drive
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
