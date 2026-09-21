"use client";

import React, { useState } from "react";
import Link from "next/link";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
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
  Info,
  Download,
  ArrowLeft,
  KeyRound,
  FileCode,
  Clock,
  Maximize2,
} from "lucide-react";
import { PdfPreview } from "./pdf-preview";
import { MarkdownPreview } from "./markdown-preview";

interface FileDetailViewProps {
  file: DriveFile;
  accountIndex: number;
}

export function FileDetailView({ file, accountIndex }: FileDetailViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const category = getFileCategory(file.mimeType, file.name);
  const isImage =
    category === "image" ||
    file.mimeType.startsWith("image/") ||
    !!file.thumbnailLink;

  const isPdf =
    category === "pdf" ||
    file.mimeType === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const isMarkdown =
    file.mimeType === "text/markdown" ||
    file.mimeType === "text/x-markdown" ||
    file.name.toLowerCase().endsWith(".md") ||
    file.name.toLowerCase().endsWith(".markdown");

  const downloadUrl =
    file.webContentLink ||
    `https://drive.google.com/uc?export=download&id=${file.id}`;

  const imageSrc = file.thumbnailLink || file.webViewLink || "";

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
      value:
        file.owners && file.owners.length > 0
          ? file.owners[0].displayName
          : "Saya",
      copyValue:
        file.owners && file.owners.length > 0
          ? file.owners[0].displayName
          : "Saya",
      icon: User,
    },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Top Breadcrumb & Back Navigation - Compact & Mobile First */}
      <div className="flex items-center gap-2 px-0.5">
        <Link href={`/${accountIndex}`}>
          <button className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto no-scrollbar">
          <Link
            href={`/${accountIndex}`}
            className="hover:text-blue-600 font-medium whitespace-nowrap"
          >
            My Drive
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-md">
            {file.name}
          </span>
        </div>
      </div>

      {/* Main File Card */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-4">
        {/* Header with Icon, Title, and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 shrink-0">
              <FileTypeIcon mimeType={file.mimeType} size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight">
                {file.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-medium py-0">
                  {formatBytes(file.size)}
                </Badge>
                {file.shared && (
                  <Badge variant="info" className="text-[10px] py-0">
                    Dibagikan
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Open Drive, Copy Download URL, Lightbox) */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            {/* Copy Download URL Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(downloadUrl, "downloadUrl")}
              className="flex-1 sm:flex-initial h-8 px-2.5 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
            >
              {copiedField === "downloadUrl" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    Tersalin!
                  </span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px]">Salin URL Unduh</span>
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
                  className="w-full h-8 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Buka di Drive</span>
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Media / Image Preview with yet-another-react-lightbox Slide trigger */}
        {isImage && imageSrc && (
          <div className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50/80 max-h-72 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={file.name}
              className="max-h-60 object-contain rounded-lg shadow-2xs cursor-pointer group-hover:opacity-95 transition"
              onClick={() => setLightboxOpen(true)}
            />
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 text-white text-[11px] font-medium px-3 py-1.5 backdrop-blur shadow-md hover:bg-slate-900 transition cursor-pointer"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Pratinjau Layar Penuh</span>
            </button>
          </div>
        )}

        {/* PDF Document Preview */}
        {isPdf && <PdfPreview file={file} accountIndex={accountIndex} />}

        {/* Markdown Document Preview */}
        {isMarkdown && <MarkdownPreview file={file} />}

        {/* Metadata Rows List */}
        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-[#FAFAFB]/60 overflow-hidden metadata-list">
          {metadataItems.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedField === item.id;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 sm:px-3.5 gap-2 hover:bg-slate-50/90 transition-colors metadata-row"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0 min-w-[110px] sm:min-w-[140px] metadata-label">
                  <Icon className="h-3.5 w-3.5 text-slate-400 metadata-icon" />
                  <span className="text-[11px] sm:text-xs">{item.label}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                  <span
                    className={`text-xs text-slate-900 truncate metadata-value ${
                      item.isMono ? "font-mono text-[10px] sm:text-[11px]" : "font-medium"
                    }`}
                    title={item.value}
                  >
                    {item.value}
                  </span>

                  <button
                    onClick={() => copyToClipboard(item.copyValue, item.id)}
                    className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer metadata-copy-btn"
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

        {/* Direct Download URL Card */}
        <div className="file-download-card rounded-xl bg-blue-50/50 border border-blue-100 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="file-download-title font-semibold text-blue-900 flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Download className="file-download-icon h-3.5 w-3.5 text-blue-600" /> Link Download Langsung
            </span>
            <button
              onClick={() => copyToClipboard(downloadUrl, "directUrl")}
              className="file-download-btn text-blue-700 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
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
          <p className="file-download-box font-mono text-[10px] sm:text-[11px] text-slate-600 truncate bg-white/80 border border-blue-100/80 rounded-md px-2.5 py-1">
            {downloadUrl}
          </p>
        </div>
      </div>

      {/* yet-another-react-lightbox Modal with Slide feature */}
      {isImage && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={[
            { src: imageSrc, alt: file.name },
            {
              src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
              alt: "Diagram Arsitektur Sistem Q3",
            },
            {
              src: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80",
              alt: "Mockup Dashboard WhiteSmoke v2",
            },
          ]}
        />
      )}
    </div>
  );
}
