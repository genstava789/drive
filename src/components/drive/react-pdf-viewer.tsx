"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileWarning, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configure worker for client-side rendering
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface ReactPdfViewerProps {
  fileUrl: string;
  currentPage: number;
  zoom: number;
  onTotalPagesChange?: (total: number) => void;
  onFallback?: () => void;
}

export function ReactPdfViewer({
  fileUrl,
  currentPage,
  zoom,
  onTotalPagesChange,
  onFallback,
}: ReactPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<boolean>(false);

  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadError(false);
    if (onTotalPagesChange) {
      onTotalPagesChange(numPages);
    }
  }

  function handleDocumentLoadError(error: Error) {
    console.warn("ReactPdf load notice:", error.message);
    setLoadError(true);
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <FileWarning className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">
            Pratinjau PDF Stream Eksternal
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Berkas Google Drive memerlukan otorisasi sesi langsung. Gunakan mode &quot;Drive Viewer&quot; atau pratinjau lembar terstruktur.
          </p>
        </div>
        {onFallback && (
          <Button
            size="sm"
            variant="outline"
            onClick={onFallback}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Tampilkan Lembar Terstruktur
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: "top center",
      }}
      className="flex flex-col items-center transition-transform duration-150"
    >
      <Document
        file={fileUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={
          <div className="flex items-center gap-2 text-xs text-slate-500 py-12">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Memuat halaman PDF dengan react-pdf...</span>
          </div>
        }
        error={<div />}
        className="rounded-lg shadow-md border border-slate-200 overflow-hidden bg-white"
      >
        <Page
          pageNumber={currentPage}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
}
