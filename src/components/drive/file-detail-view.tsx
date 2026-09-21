"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DriveFile } from "@/types/drive";
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
  ArrowLeft,
  KeyRound,
  FileCode,
  Clock,
} from "lucide-react";

interface FileDetailViewProps {
  file: DriveFile;
  accountIndex: number;
}

export function FileDetailView({ file, accountIndex }: FileDetailViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const category = getFileCategory(file.mimeType);
  const downloadUrl =
    file.webContentLink ||
    `https://drive.google.com/uc?export=download&id=${file.id}`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const metadataItems = [
    {
      id: "filename",
      label: "Nama Berkas",
      value: file.name,
      copyValue: file.name,
      icon: FileCode,
    },
    {
      id: "driveId",
      label: "ID Drive",
      value: file.id,
      copyValue: file.id,
      icon: KeyRound,
      isMono: true,
    },
    {
      id: "size",
      label: "Ukuran Berkas",
      value: `${formatBytes(file.size)} (${file.size?.toLocaleString() || 0} bytes)`,
      copyValue: String(file.size || 0),
      icon: HardDrive,
      isMono: true,
    },
    {
      id: "createdTime",
      label: "Waktu Dibuat",
      value: formatDate(file.createdTime || file.modifiedTime),
      copyValue: file.createdTime || file.modifiedTime,
      icon: Calendar,
    },
    {
      id: "modifiedTime",
      label: "Terakhir Diubah",
      value: formatDate(file.modifiedTime),
      copyValue: file.modifiedTime,
      icon: Clock,
    },
    {
      id: "mimeType",
      label: "Tipe MIME",
      value: file.mimeType,
      copyValue: file.mimeType,
      icon: Info,
      isMono: true,
    },
    {
      id: "owner",
      label: "Pemilik",
      value: file.owners && file.owners.length > 0 ? file.owners[0].displayName : "Saya",
      copyValue: file.owners && file.owners.length > 0 ? file.owners[0].displayName : "Saya",
      icon: User,
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex items-center gap-2">
        <Link href={`/${accountIndex}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href={`/${accountIndex}`} className="hover:text-blue-600 font-medium">
            My Drive
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
            {file.name}
          </span>
        </div>
      </div>

      {/* Main File Card */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
        {/* Header with Icon, Title, and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-1 shrink-0">
              <FileTypeIcon mimeType={file.mimeType} size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 break-words leading-snug">
                {file.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[11px] font-medium">
                  {formatBytes(file.size)}
                </Badge>
                {file.shared && (
                  <Badge variant="info" className="text-[11px]">
                    Dibagikan
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Open Drive, Copy Download URL) */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Copy Download URL Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(downloadUrl, "downloadUrl")}
              className="flex-1 sm:flex-initial h-8.5 px-3 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              {copiedField === "downloadUrl" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Salin URL Unduh</span>
                </>
              )}
            </Button>

            {/* Open in Google Drive Button */}
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial inline-flex"
              >
                <Button
                  size="sm"
                  className="w-full h-8.5 px-3.5 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Drive</span>
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Media / Image Preview if available */}
        {category === "image" && file.thumbnailLink && (
          <div className="w-full flex items-center justify-center bg-slate-50/80 rounded-xl p-3 border border-slate-100 max-h-72 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.thumbnailLink}
              alt={file.name}
              className="max-h-64 object-contain rounded-lg shadow-2xs"
            />
          </div>
        )}

        {/* Drive Information Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Informasi Berkas (Drive Information)
            </h2>
            <span className="text-[11px] text-slate-400">
              Klik icon salin untuk menduplikasi metadata
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-[#FAFAFB]/60 overflow-hidden">
            {metadataItems.map((item) => {
              const Icon = item.icon;
              const isCopied = copiedField === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 gap-1.5 hover:bg-slate-50/90 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0 min-w-[140px]">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-1 min-w-0">
                    <span
                      className={`text-xs text-slate-900 truncate ${
                        item.isMono ? "font-mono text-[11px]" : "font-medium"
                      }`}
                      title={item.value}
                    >
                      {item.value}
                    </span>

                    <button
                      onClick={() => copyToClipboard(item.copyValue, item.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                      title={`Salin ${item.label}`}
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Download URL Card */}
        <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-blue-600" /> Link Download Langsung
            </span>
            <button
              onClick={() => copyToClipboard(downloadUrl, "directUrl")}
              className="text-blue-700 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedField === "directUrl" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Salin URL
                </>
              )}
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-600 truncate bg-white/80 border border-blue-100/80 rounded-md px-2.5 py-1.5">
            {downloadUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
