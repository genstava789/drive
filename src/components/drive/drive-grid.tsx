"use client";

import React from "react";
import { DriveFile } from "@/types/drive";
import { FileTypeIcon } from "./file-type-icon";
import { formatBytes, formatDate, getFileCategory } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Folder, MoreVertical, ExternalLink, Eye, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DriveGridProps {
  files: DriveFile[];
  onOpenFolder: (folderId: string, folderName: string) => void;
  onPreviewFile: (file: DriveFile) => void;
}

export function DriveGrid({
  files,
  onOpenFolder,
  onPreviewFile,
}: DriveGridProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        <Folder className="mx-auto h-12 w-12 text-slate-300" />
        <h4 className="mt-3 text-sm font-semibold text-slate-700">
          Folder ini kosong
        </h4>
        <p className="mt-1 text-xs text-slate-400">
          Tidak ada berkas atau direktori dalam folder ini.
        </p>
      </div>
    );
  }

  // Separate folders and files for classic cloud explorer feel
  const folders = files.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder"
  );
  const regularFiles = files.filter(
    (f) => f.mimeType !== "application/vnd.google-apps.folder"
  );

  return (
    <div className="space-y-6">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Folder ({folders.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onOpenFolder(folder.id, folder.name)}
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 transition-transform group-hover:scale-110">
                    <FileTypeIcon mimeType={folder.mimeType} />
                  </div>
                  <span className="truncate text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                    {folder.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {regularFiles.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Berkas ({regularFiles.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {regularFiles.map((file) => {
              const category = getFileCategory(file.mimeType);

              return (
                <div
                  key={file.id}
                  onClick={() => onPreviewFile(file)}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all duration-150 cursor-pointer overflow-hidden"
                >
                  {/* Top card bar with icon and dropdown */}
                  <div className="flex items-start justify-between">
                    <div className="shrink-0 transition-transform group-hover:scale-105">
                      <FileTypeIcon mimeType={file.mimeType} size={22} />
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-70 group-hover:opacity-100"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="h-6 w-6 text-slate-400 hover:text-slate-700 -mr-1 -mt-1"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onPreviewFile(file)}>
                            <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                            Detail Berkas
                          </DropdownMenuItem>
                          {file.webViewLink && (
                            <DropdownMenuItem asChild>
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                Buka di Drive
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Thumbnail if image */}
                  {category === "image" && file.thumbnailLink ? (
                    <div className="my-2.5 h-20 w-full overflow-hidden rounded-md bg-slate-50 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="my-3" />
                  )}

                  {/* File name & size */}
                  <div className="space-y-1">
                    <p
                      className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{formatBytes(file.size)}</span>
                      {file.shared && <Users className="h-3 w-3 text-slate-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
