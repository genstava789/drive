"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configure worker for local client-side rendering
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface ReactPdfViewerProps {
  fileUrl: string;
  currentPage: number;
  zoom: number;
  rotation?: number;
  onTotalPagesChange?: (total: number) => void;
  onLoadSuccess?: () => void;
}

export function ReactPdfViewer({
  fileUrl,
  currentPage,
  zoom,
  rotation = 0,
  onTotalPagesChange,
  onLoadSuccess,
}: ReactPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
    setIsLoading(false);
    if (onTotalPagesChange) {
      onTotalPagesChange(numPages);
    }
    if (onLoadSuccess) {
      onLoadSuccess();
    }
  }

  function handleDocumentLoadError(err: Error) {
    console.error("[react-pdf] Document load error:", err);
    setError(err.message || "Gagal memuat dokumen PDF");
    setIsLoading(false);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-3 bg-white rounded-xl border border-red-200 shadow-sm my-8">
        <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            Kendala Memuat Berkas PDF
          </h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {error}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setIsLoading(true);
          }}
          className="text-xs h-8 cursor-pointer"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: "top center",
      }}
      className="flex flex-col items-center transition-transform duration-150 py-4"
    >
      <Document
        file={fileUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Memuat dokumen dengan react-pdf...</span>
          </div>
        }
        error={null}
        className="rounded-lg shadow-md border border-slate-200 overflow-hidden bg-white"
      >
        <Page
          pageNumber={currentPage}
          rotate={rotation}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div className="w-[500px] h-[650px] bg-slate-50 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          }
        />
      </Document>
    </div>
  );
}
