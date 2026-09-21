"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Maximize2,
  Minimize2,
  ExternalLink,
  Download,
  Loader2,
  Radio,
  Tv,
  AlertCircle,
} from "lucide-react";
import { formatBytes, getDownloadUrl, getVideoStreamUrl } from "@/lib/utils";

const VidstackPlayer = dynamic(
  () =>
    import("./vidstack-player-inner").then((mod) => mod.VidstackPlayerInner),
  {
    ssr: false,
    loading: () => <VideoLoadingSkeleton />,
  }
);

function VideoLoadingSkeleton() {
  return (
    <div className="w-full aspect-video rounded-xl bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800 shadow-lg">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <Video className="h-4 w-4 text-blue-400 absolute" />
      </div>
      <div className="flex flex-col items-center text-center px-4">
        <p className="text-xs font-semibold text-slate-200">
          Menyiapkan Vidstack Player...
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Menghubungkan stream langsung Google Drive
        </p>
      </div>
    </div>
  );
}

interface VideoPreviewProps {
  file: DriveFile;
  accountIndex?: number;
}

export function VideoPreview({ file, accountIndex = 0 }: VideoPreviewProps) {
  const [isTheater, setIsTheater] = useState(false);
  const [useDriveIframe, setUseDriveIframe] = useState(false);

  // Direct HTTP 206 streaming proxy URL
  const streamUrl = getVideoStreamUrl(file.id, accountIndex);
  const downloadUrl = getDownloadUrl(file.id, file.name);

  // Get high-res poster thumbnail from Google Drive if available
  const posterUrl = file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+[^/]*$/, "=s1200")
    : undefined;

  // Extract video format & resolution info from filename
  const fileNameLower = file.name.toLowerCase();
  const formatMatch = file.name.match(/\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v|ts)$/i);
  const videoFormat = formatMatch ? formatMatch[1].toUpperCase() : "VIDEO";

  const resolution = fileNameLower.includes("2160p") || fileNameLower.includes("4k")
    ? "4K Ultra HD"
    : fileNameLower.includes("1080p")
    ? "1080p FHD"
    : fileNameLower.includes("720p")
    ? "720p HD"
    : fileNameLower.includes("480p")
    ? "480p SD"
    : null;

  const drivePreviewUrl =
    file.webViewLink && file.webViewLink.includes("drive.google.com")
      ? file.webViewLink.replace(/\/view(\?.*)?$/, "/preview")
      : `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all duration-300 ${
        isTheater
          ? "fixed inset-2 sm:inset-4 z-50 flex flex-col bg-slate-950 border-slate-800 shadow-2xl"
          : "relative w-full"
      }`}
    >
      {/* Video Player Header Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b select-none transition-colors ${
          isTheater
            ? "bg-slate-900/90 border-slate-800 text-slate-100"
            : "bg-slate-50/90 border-slate-200/80 text-slate-800"
        }`}
      >
        {/* Left: Video File Info & Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 max-w-full sm:max-w-xl">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold shrink-0 ${
              isTheater
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "bg-blue-600 text-white shadow-2xs"
            }`}
          >
            <Video className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                className={`font-semibold truncate text-xs sm:text-sm ${
                  isTheater ? "text-slate-100" : "text-slate-900"
                }`}
                title={file.name}
              >
                {file.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Live Streaming Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  isTheater
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Stream Langsung</span>
              </div>

              {/* Format Badge */}
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-mono ${
                  isTheater
                    ? "border-slate-700 text-slate-300"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                {videoFormat}
              </Badge>

              {/* Resolution Badge */}
              {resolution && (
                <Badge
                  variant="info"
                  className="text-[10px] px-1.5 py-0 font-semibold"
                >
                  {resolution}
                </Badge>
              )}

              {/* File Size */}
              {file.size ? (
                <span
                  className={`text-[10px] font-mono ${
                    isTheater ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {formatBytes(file.size)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Player Controls Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Switch between Vidstack & Google Drive Preview Iframe */}
          <Button
            variant={useDriveIframe ? "default" : "outline"}
            size="sm"
            onClick={() => setUseDriveIframe(!useDriveIframe)}
            className={`h-7.5 px-2.5 text-[11px] gap-1.5 rounded-lg cursor-pointer ${
              isTheater
                ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                : ""
            }`}
            title={
              useDriveIframe
                ? "Ganti ke Pemutar Vidstack"
                : "Ganti ke Preview Bawaan Google Drive"
            }
          >
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">
              {useDriveIframe ? "Vidstack" : "Drive Preview"}
            </span>
          </Button>

          {/* Theater Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTheater(!isTheater)}
            className={`h-7.5 px-2.5 text-[11px] gap-1.5 rounded-lg cursor-pointer ${
              isTheater
                ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                : ""
            }`}
            title={isTheater ? "Tutup Mode Bioskop" : "Mode Bioskop (Layar Lebar)"}
          >
            {isTheater ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Normal</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bioskop</span>
              </>
            )}
          </Button>

          {/* Direct Download Button */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            download={file.name}
            className="inline-flex"
            title="Unduh Berkas Video"
          >
            <Button
              size="sm"
              variant="outline"
              className={`h-7.5 px-2 text-[11px] rounded-lg cursor-pointer ${
                isTheater
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : ""
              }`}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        className={`relative flex items-center justify-center bg-black ${
          isTheater
            ? "flex-1 w-full h-full min-h-0 overflow-hidden p-2 sm:p-4"
            : "w-full aspect-video"
        }`}
      >
        {useDriveIframe ? (
          /* Google Drive Native Iframe Preview */
          <div className="w-full h-full relative">
            <iframe
              src={drivePreviewUrl}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen"
              title={`Preview ${file.name}`}
            />
          </div>
        ) : (
          /* Vidstack Media Player */
          <div className="w-full h-full flex items-center justify-center">
            <VidstackPlayer
              src={streamUrl}
              title={file.name}
              poster={posterUrl}
              mimeType={file.mimeType}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Info / Quick Hints Footer */}
      {!isTheater && (
        <div className="px-3.5 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <Radio className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              Streaming langsung via protokol HTTP 206 Partial Content (Vidstack)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 font-mono text-[10px] text-slate-400">
            <span>Spasi: Play/Pause</span>
            <span>•</span>
            <span>F: Layar Penuh</span>
            <span>•</span>
            <span>M: Mute</span>
          </div>
        </div>
      )}
    </div>
  );
}
