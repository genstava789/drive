"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";

const ReactPdfViewer = dynamic(
  () => import("./react-pdf-viewer").then((mod) => mod.ReactPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-16 text-xs text-slate-500 gap-2.5">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span>Memuat mesin react-pdf...</span>
      </div>
    ),
  }
);

interface PdfPreviewProps {
  file: DriveFile;
  accountIndex?: number;
}

export function PdfPreview({ file, accountIndex = 0 }: PdfPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reliable same-origin PDF endpoint to avoid CORS issues
  const pdfApiUrl = `/api/drive/pdf?id=${encodeURIComponent(file.id)}&accountIndex=${accountIndex}`;

  const downloadUrl =
    file.webContentLink ||
    `https://drive.google.com/uc?export=download&id=${file.id}`;

  const drivePreviewUrl =
    file.webViewLink && file.webViewLink.includes("drive.google.com")
      ? file.webViewLink.replace(/\/view(\?.*)?$/, "/preview")
      : `https://drive.google.com/file/d/${file.id}/preview`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoom(100);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all ${
        isFullscreen
          ? "fixed inset-2 z-50 flex flex-col shadow-2xl bg-white"
          : "relative"
      }`}
    >
      {/* PDF Viewer Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200/80 text-xs select-none">
        {/* Left: Document Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[180px] xs:max-w-[220px] sm:max-w-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-600 font-bold shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 truncate text-[11px] sm:text-xs" title={file.name}>
              {file.name}
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              react-pdf viewer • {totalPages} Halaman
            </p>
          </div>
        </div>

        {/* Center: Controls for react-pdf */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer transition-colors"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-700 min-w-[55px] text-center font-mono">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer transition-colors"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5 shadow-2xs">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              title="Perkecil"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-600 px-1 min-w-[36px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              title="Perbesar"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Rotate Button */}
          <button
            onClick={handleRotate}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-2xs cursor-pointer transition-colors"
            title="Putar Dokumen (90°)"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Download Raw PDF */}
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 cursor-pointer hover:bg-slate-50"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </Button>
          </a>

          {/* Open in Google Drive Viewer */}
          <a
            href={drivePreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Buka Pratinjau Google Drive"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Google Drive</span>
            </Button>
          </a>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 text-slate-500 hover:text-slate-900 cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Content Area - 100% react-pdf Canvas Rendering */}
      <div
        className={`bg-slate-100/90 overflow-auto flex items-center justify-center p-3 sm:p-6 ${
          isFullscreen ? "flex-1" : "min-h-[460px] max-h-[640px]"
        }`}
      >
        <ReactPdfViewer
          fileUrl={pdfApiUrl}
          currentPage={currentPage}
          zoom={zoom}
          rotation={rotation}
          onTotalPagesChange={(t) => setTotalPages(t)}
        />
      </div>
    </div>
  );
}
