"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DriveFile } from "@/types/drive";
import { FileTypeIcon } from "./file-type-icon";
import { formatBytes, getFileCategory } from "@/lib/utils";
import { Folder, MoreVertical, ExternalLink, Eye, Users, LogIn } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { restoreAllAccounts } from "@/lib/account-store";

interface DriveGridProps {
  files: DriveFile[];
  accountIndex?: number;
  hasNoAccount?: boolean;
}

export function DriveGrid({
  files,
  accountIndex = 0,
  hasNoAccount = false,
}: DriveGridProps) {
  const router = useRouter();

  const handleItemClick = (file: DriveFile) => {
    router.push(`/${accountIndex}/${file.id}`);
  };

  if (hasNoAccount) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
          <LogIn className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">
          Tidak ada daftar file
        </h4>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          tidak ada daftar file silahkan login ke akun google drive mu.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => signIn("google")}
            className="h-8.5 px-3.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.54 0 2.92.54 4.01 1.43l3.01-3.01C17.19 1.77 14.77 1 12 1 7.42 1 3.53 3.61 1.64 7.39l3.66 2.84C6.18 7.35 8.84 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.86c2.14-1.98 3.74-4.89 3.74-8.68z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.77c-.23-.68-.36-1.41-.36-2.17s.13-1.49.36-2.17L1.64 7.59C.6 9.68 0 12 0 14.4s.6 4.72 1.64 6.81l3.66-2.84z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.68-2.86c-1.07.72-2.45 1.16-4.25 1.16-3.16 0-5.82-2.35-6.7-5.23L1.64 16c1.89 3.78 5.78 6.4 10.36 6.4z"
              />
            </svg>
            <span>Login Akun Google Drive</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => restoreAllAccounts()}
            className="h-8.5 px-3 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Reset Akun Demo
          </Button>
        </div>
      </div>
    );
  }

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

  const folders = files.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder"
  );
  const regularFiles = files.filter(
    (f) => f.mimeType !== "application/vnd.google-apps.folder"
  );

  return (
    <div className="space-y-5">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Folder ({folders.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleItemClick(folder)}
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0 transition-transform group-hover:scale-110">
                    <FileTypeIcon mimeType={folder.mimeType} size={20} />
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
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Berkas ({regularFiles.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {regularFiles.map((file) => {
              const category = getFileCategory(file.mimeType);

              return (
                <div
                  key={file.id}
                  onClick={() => handleItemClick(file)}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all duration-150 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="shrink-0 transition-transform group-hover:scale-105">
                      <FileTypeIcon mimeType={file.mimeType} size={20} />
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
                          <DropdownMenuItem onClick={() => handleItemClick(file)}>
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
                    <div className="my-2 h-16 sm:h-20 w-full overflow-hidden rounded-md bg-slate-50 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="my-2" />
                  )}

                  <div className="space-y-0.5">
                    <p
                      className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
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
